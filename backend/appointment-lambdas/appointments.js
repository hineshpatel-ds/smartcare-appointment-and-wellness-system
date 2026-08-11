const { config, memory, scanItems, getItem, putItem, mirrorToFirestore } = require('../lib/store');
const { createId, nowIso, isUpcomingAppointmentSlot, requireSignedInContext } = require('../lib/util');
const { enqueueAppointmentNotification } = require('../notifications-lambdas/notify');
const { getServiceById } = require('./services');

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING_APPROVAL', 'CONFIRMED'];

async function findAssignableDoctor(serviceId, date, time, existingAppointments) {
  const users = await scanItems(config.usersTable, memory.users);
  const candidates = users.filter(
    (user) => user.role === 'doctor' && user.status === 'ACTIVE' && (user.serviceIds || []).includes(serviceId)
  );
  if (!candidates.length) return null;

  const busyDoctorIds = new Set(
    existingAppointments
      .filter((appointment) => appointment.date === date && appointment.time === time && ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status))
      .map((appointment) => appointment.doctorId)
  );
  const available = candidates.filter((doctor) => !busyDoctorIds.has(doctor.userId));
  if (!available.length) return null;

  const loadByDoctor = new Map();
  for (const appointment of existingAppointments) {
    if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) continue;
    loadByDoctor.set(appointment.doctorId, (loadByDoctor.get(appointment.doctorId) || 0) + 1);
  }
  available.sort((a, b) => (loadByDoctor.get(a.userId) || 0) - (loadByDoctor.get(b.userId) || 0));
  return available[0];
}

async function bookAppointment(input) {
  const required = ['userId', 'serviceId', 'date', 'time'];
  for (const field of required) {
    if (!input[field]) throw new Error(`${field} is required`);
  }
  if (!isUpcomingAppointmentSlot(input.date, input.time)) {
    throw new Error('Appointment date and time must be upcoming');
  }

  const service = await getServiceById(input.serviceId);
  if (!service) throw new Error('Selected service was not found');

  const patient = await getItem(config.usersTable, { userId: input.userId }, memory.users);
  if (!patient) throw new Error('Patient account not found');

  const existingAppointments = await scanItems(config.appointmentsTable, memory.appointments);
  const doctor = await findAssignableDoctor(input.serviceId, input.date, input.time, existingAppointments);
  if (!doctor) {
    throw new Error('No doctors are currently available for this service at that time. Please choose another slot.');
  }

  const appointment = {
    appointmentId: createId('apt'),
    userId: input.userId,
    serviceId: service.serviceId,
    service: service.name,
    doctorId: doctor.userId,
    doctorName: doctor.displayName,
    patientName: patient.displayName,
    patientEmail: patient.email,
    doctorEmail: doctor.email,
    date: input.date,
    time: input.time,
    notes: input.notes || '',
    status: 'PENDING_APPROVAL',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await putItem(config.appointmentsTable, 'appointmentId', appointment, memory.appointments);
  await mirrorToFirestore('appointments', appointment.appointmentId, appointment);
  await enqueueAppointmentNotification('APPOINTMENT_REQUEST', appointment);
  return appointment;
}

async function listAppointments({ userId, role }) {
  requireSignedInContext({ userId, role });
  const items = await scanItems(config.appointmentsTable, memory.appointments);
  if (role === 'coordinator') return items;
  if (role === 'doctor') return items.filter((item) => item.doctorId === userId);
  return items.filter((item) => item.userId === userId);
}

async function updateAppointment(appointmentId, changes) {
  const { userId, role, status } = changes;
  const current = await getItem(config.appointmentsTable, { appointmentId }, memory.appointments);
  if (!current) throw new Error('Appointment not found');

  const isAssignedDoctor = role === 'doctor' && userId === current.doctorId;
  const isCoordinator = role === 'coordinator';
  if (!isAssignedDoctor && !isCoordinator) {
    throw new Error('Doctor or coordinator access required to update this appointment');
  }
  if (!['CONFIRMED', 'REJECTED', 'CANCELLED'].includes(status)) {
    throw new Error('status must be CONFIRMED, REJECTED, or CANCELLED');
  }

  const updated = {
    ...current,
    status,
    updatedAt: nowIso()
  };
  await putItem(config.appointmentsTable, 'appointmentId', updated, memory.appointments);
  await mirrorToFirestore('appointments', appointmentId, updated);
  await enqueueAppointmentNotification(`APPOINTMENT_${status}`, updated);
  return updated;
}

module.exports = { bookAppointment, listAppointments, updateAppointment };



