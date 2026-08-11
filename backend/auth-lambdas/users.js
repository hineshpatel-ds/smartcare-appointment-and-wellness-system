const { config, memory, scanItems, getItem, putItem, mirrorToFirestore, cognito } = require('../lib/store');
const {
  createId,
  nowIso,
  hashPassword,
  caesarCipher,
  normalizeAnswer,
  requireCoordinatorContext
} = require('../lib/util');
const { sendEmail } = require('../notifications-lambdas/email');
const { listServices } = require('../appointment-lambdas/services');

const DOCTOR_STATUS_MESSAGES = {
  PENDING_APPROVAL: 'Your doctor account is awaiting coordinator approval.',
  REJECTED: 'Your doctor account registration was not approved. Please contact a wellness coordinator.'
};

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, securityAnswer, healthcareCodeEncrypted, cipherShift, ...safe } = user;
  return safe;
}

function buildCipherClue(encryptedCode) {
  const value = String(encryptedCode || '');
  if (!value) return 'Use the healthcare code created during registration.';
  if (value.length <= 2) return `Caesar-shifted clue has ${value.length} character${value.length === 1 ? '' : 's'}.`;
  return `Caesar-shifted clue: ${value[0]}${'*'.repeat(Math.max(1, value.length - 2))}${value[value.length - 1]} (${value.length} characters).`;
}

async function resolveSpecialtyNames(serviceIds = []) {
  const services = await listServices();
  return serviceIds
    .map((id) => services.find((service) => service.serviceId === id)?.name)
    .filter(Boolean);
}

async function createUserRecord(input, { status, allowCognito = true }) {
  const shift = Number(input.cipherShift || 3);
  const isDoctor = input.role === 'doctor';

  const user = {
    userId: input.userId,
    displayName: input.displayName || input.userId,
    email: input.email,
    phone: input.phone || '',
    role: input.role,
    status,
    securityQuestion: input.securityQuestion,
    securityAnswer: normalizeAnswer(input.securityAnswer),
    healthcareCodeEncrypted: caesarCipher(input.healthcareCode, shift),
    cipherShift: shift,
    passwordHash: hashPassword(input.password),
    createdAt: nowIso(),
    lastLoginAt: null,
    ...(isDoctor
      ? {
          serviceIds: input.serviceIds,
          licenseNumber: input.licenseNumber,
          schedule: Array.isArray(input.schedule) ? input.schedule : [],
          bio: input.bio || ''
        }
      : {})
  };

  if (allowCognito && config.userPoolClientId) {
    try {
      await cognito
        .signUp({
          ClientId: config.userPoolClientId,
          Username: input.userId,
          Password: input.password,
          UserAttributes: [
            { Name: 'email', Value: input.email },
            { Name: 'custom:role', Value: input.role }
          ]
        })
        .promise();
    } catch (error) {
      if (error.code !== 'UsernameExistsException') throw error;
    }
  }

  await putItem(config.usersTable, 'userId', user, memory.users);
  await mirrorToFirestore('users', user.userId, user);
  return user;
}

async function registerUser(input) {
  const required = ['userId', 'email', 'password', 'role', 'securityQuestion', 'securityAnswer', 'healthcareCode'];
  for (const field of required) {
    if (!input[field]) throw new Error(`${field} is required`);
  }

  if (input.role === 'coordinator') {
    throw new Error('Coordinator accounts cannot self-register');
  }
  if (!['patient', 'doctor'].includes(input.role)) {
    throw new Error('role must be patient or doctor');
  }

  const existing = await getItem(config.usersTable, { userId: input.userId }, memory.users);
  if (existing) throw new Error('userId is already registered');

  let serviceIds = [];
  if (input.role === 'doctor') {
    if (!input.licenseNumber) throw new Error('licenseNumber is required for doctor registration');
    const requested = Array.isArray(input.serviceIds) ? input.serviceIds : [];
    const services = await listServices();
    serviceIds = requested.filter((id) => services.some((service) => service.serviceId === id));
    if (!serviceIds.length) throw new Error('At least one valid service must be selected for doctor registration');
  }

  const status = input.role === 'doctor' ? 'PENDING_APPROVAL' : 'ACTIVE';
  const user = await createUserRecord({ ...input, serviceIds }, { status });

  if (input.role === 'doctor') {
    await sendEmail(
      user.email,
      'SAWS doctor registration received',
      `<p>Thanks for registering as a specialist on SmartCare. Your account (${user.userId}) is now pending review by a wellness coordinator. You'll receive another email once it's approved.</p>`
    );
  } else {
    await sendEmail(
      user.email,
      'SAWS registration successful',
      `<p>Welcome to SmartCare, ${user.displayName}! Your patient account (${user.userId}) is ready to use.</p>`
    );
  }

  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    status: user.status,
    securityQuestion: user.securityQuestion,
    confirmationRequired: Boolean(config.userPoolClientId)
  };
}

async function confirmRegistration({ userId, confirmationCode }) {
  if (!userId || !confirmationCode) throw new Error('userId and confirmationCode are required');
  if (!config.userPoolClientId) return { confirmed: true };
  await cognito
    .confirmSignUp({
      ClientId: config.userPoolClientId,
      Username: userId,
      ConfirmationCode: confirmationCode
    })
    .promise();
  return { confirmed: true };
}

async function startLogin({ userId, password }) {
  if (!userId || !password) throw new Error('userId and password are required');
  const user = await getItem(config.usersTable, { userId }, memory.users);
  if (!user) throw new Error('Invalid user ID or password');

  if (config.userPoolClientId) {
    await cognito
      .initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: config.userPoolClientId,
        AuthParameters: {
          USERNAME: userId,
          PASSWORD: password
        }
      })
      .promise();
  } else if (user.passwordHash !== hashPassword(password)) {
    throw new Error('Invalid user ID or password');
  }

  if (user.role === 'doctor' && user.status !== 'ACTIVE') {
    throw new Error(DOCTOR_STATUS_MESSAGES[user.status] || 'Your doctor account is not active');
  }

  const stat = { loginId: createId('login'), userId, role: user.role, createdAt: nowIso() };
  await putItem(config.loginStatsTable, 'loginId', stat, memory.loginStats);

  return {
    nextStage: 'security-question',
    securityQuestion: user.securityQuestion,
    sessionId: createId('session')
  };
}

async function verifySecurityQuestion({ userId, answer }) {
  if (!userId || !answer) throw new Error('userId and answer are required');
  const user = await getItem(config.usersTable, { userId }, memory.users);
  if (!user || user.securityAnswer !== normalizeAnswer(answer)) throw new Error('Invalid security answer');
  return {
    nextStage: 'caesar-cipher',
    cipherClue: buildCipherClue(user.healthcareCodeEncrypted)
  };
}

async function verifyCipher({ userId, healthcareCode }) {
  if (!userId || !healthcareCode) throw new Error('userId and healthcareCode are required');
  const user = await getItem(config.usersTable, { userId }, memory.users);
  if (!user) throw new Error('Invalid user');
  const expected = caesarCipher(healthcareCode, user.cipherShift);
  if (expected !== user.healthcareCodeEncrypted) throw new Error('Invalid healthcare code');

  const updated = { ...user, lastLoginAt: nowIso() };
  await putItem(config.usersTable, 'userId', updated, memory.users);
  await mirrorToFirestore('users', updated.userId, updated);

  await sendEmail(
    user.email,
    'SAWS sign-in successful',
    `<p>Hi ${user.displayName || user.userId}, you just signed in to SmartCare successfully. If this wasn't you, please contact support.</p>`
  );

  return {
    token: Buffer.from(JSON.stringify({ userId: user.userId, role: user.role, issuedAt: nowIso() })).toString('base64'),
    user: {
      userId: user.userId,
      displayName: user.displayName,
      email: user.email,
      role: user.role
    }
  };
}

async function ensureCoordinatorSeed() {
  const {
    COORDINATOR_USER_ID: userId,
    COORDINATOR_EMAIL: email,
    COORDINATOR_PASSWORD: password,
    COORDINATOR_SECURITY_QUESTION: securityQuestion,
    COORDINATOR_SECURITY_ANSWER: securityAnswer,
    COORDINATOR_HEALTHCARE_CODE: healthcareCode
  } = process.env;

  if (!userId || !email || !password || !securityQuestion || !securityAnswer || !healthcareCode) {
    console.warn('Coordinator seed env vars not fully set, skipping coordinator bootstrap');
    return null;
  }

  const existing = await getItem(config.usersTable, { userId }, memory.users);
  const coordinator =
    existing ||
    (await createUserRecord(
      {
        userId,
        email,
        password,
        role: 'coordinator',
        securityQuestion,
        securityAnswer,
        healthcareCode,
        displayName: process.env.COORDINATOR_DISPLAY_NAME || 'Wellness Coordinator'
      },
      { status: 'ACTIVE' }
    ));

  // The seeded coordinator never goes through the email-confirmation-code
  // flow a self-registered user would, so their Cognito user is left in an
  // unconfirmed state (login fails with "User is not confirmed") unless we
  // confirm it administratively here. Safe to call every boot: confirming
  // an already-confirmed user is a harmless no-op error we swallow.
  if (config.userPoolId) {
    try {
      await cognito.adminConfirmSignUp({ UserPoolId: config.userPoolId, Username: userId }).promise();
    } catch (error) {
      if (error.code !== 'NotAuthorizedException') {
        console.warn(`Coordinator admin-confirm skipped: ${error.message}`);
      }
    }
  }

  if (!existing) console.log(`Seeded wellness coordinator account: ${coordinator.userId}`);
  return coordinator;
}

async function listUsersByRole(targetRole, actorContext) {
  requireCoordinatorContext(actorContext);
  if (!['patient', 'doctor'].includes(targetRole)) throw new Error('role must be patient or doctor');
  const users = await scanItems(config.usersTable, memory.users);
  return users.filter((user) => user.role === targetRole).map(sanitizeUser);
}

async function listDoctors() {
  const users = await scanItems(config.usersTable, memory.users);
  const doctors = users.filter((user) => user.role === 'doctor' && user.status === 'ACTIVE');
  return Promise.all(
    doctors.map(async (doctor) => ({
      userId: doctor.userId,
      displayName: doctor.displayName,
      bio: doctor.bio || '',
      schedule: doctor.schedule || [],
      specialties: await resolveSpecialtyNames(doctor.serviceIds || []),
      serviceIds: doctor.serviceIds || []
    }))
  );
}

async function listPendingDoctors(actorContext) {
  requireCoordinatorContext(actorContext);
  const users = await scanItems(config.usersTable, memory.users);
  return users.filter((user) => user.role === 'doctor' && user.status === 'PENDING_APPROVAL').map(sanitizeUser);
}

async function decideDoctorApproval(doctorUserId, { status, userId, role }) {
  requireCoordinatorContext({ userId, role });
  if (!['ACTIVE', 'REJECTED'].includes(status)) throw new Error('status must be ACTIVE or REJECTED');

  const doctor = await getItem(config.usersTable, { userId: doctorUserId }, memory.users);
  if (!doctor || doctor.role !== 'doctor') throw new Error('Doctor not found');

  const updated = { ...doctor, status, updatedAt: nowIso() };
  await putItem(config.usersTable, 'userId', updated, memory.users);
  await mirrorToFirestore('users', updated.userId, updated);

  const decisionCopy =
    status === 'ACTIVE'
      ? `<p>Good news, ${doctor.displayName}! Your SmartCare specialist account has been approved. You can now sign in and manage appointments.</p>`
      : `<p>Hi ${doctor.displayName}, your SmartCare specialist registration was not approved at this time. Please contact a wellness coordinator for details.</p>`;
  await sendEmail(doctor.email, `SAWS doctor registration ${status === 'ACTIVE' ? 'approved' : 'rejected'}`, decisionCopy);

  return sanitizeUser(updated);
}

async function updateDoctorSchedule(doctorUserId, schedule, actorContext) {
  const { userId, role } = actorContext || {};
  const isSelf = role === 'doctor' && userId === doctorUserId;
  const isCoordinator = role === 'coordinator';
  if (!isSelf && !isCoordinator) throw new Error('Only the doctor or a coordinator can update this schedule');
  if (!Array.isArray(schedule)) throw new Error('schedule must be an array');

  const doctor = await getItem(config.usersTable, { userId: doctorUserId }, memory.users);
  if (!doctor || doctor.role !== 'doctor') throw new Error('Doctor not found');

  const updated = { ...doctor, schedule, updatedAt: nowIso() };
  await putItem(config.usersTable, 'userId', updated, memory.users);
  await mirrorToFirestore('users', updated.userId, updated);
  return sanitizeUser(updated);
}

module.exports = {
  sanitizeUser,
  registerUser,
  confirmRegistration,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  ensureCoordinatorSeed,
  listUsersByRole,
  listDoctors,
  listPendingDoctors,
  decideDoctorApproval,
  updateDoctorSchedule
};



