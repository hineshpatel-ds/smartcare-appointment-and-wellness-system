const assert = require('assert');
const os = require('os');
const path = require('path');

process.env.FORCE_LOCAL_STORE = 'true';
process.env.ENABLE_DB_MIRRORING = 'false';
process.env.LOCAL_DATA_DIR = path.join(os.tmpdir(), `saws-appointments-test-${process.pid}`);
process.env.SNS_TOPIC_ARN = '';
process.env.SQS_QUEUE_URL = '';

const store = require('../lib/store');
const { bookAppointment, listAppointments, updateAppointment } = require('../appointment-lambdas/appointments');
const { defaultServices, listServices, getServiceById, upsertService } = require('../appointment-lambdas/services');

function futureSlot() {
  const date = new Date(Date.now() + 48 * 60 * 60 * 1000);
  return { date: date.toISOString().slice(0, 10), time: '10:30' };
}

function resetMemory() {
  for (const map of Object.values(store.memory)) map.map.clear();
  for (const service of defaultServices) store.memory.services.set(service.serviceId, service);
}

async function run() {
  resetMemory();
  const service = defaultServices[0];
  const patient = { userId: 'patient-apt', displayName: 'Pat Apt', email: 'pat@example.com', role: 'patient', status: 'ACTIVE' };
  const doctor = {
    userId: 'doctor-apt',
    displayName: 'Doc Apt',
    email: 'doc@example.com',
    role: 'doctor',
    status: 'ACTIVE',
    serviceIds: [service.serviceId]
  };
  store.memory.users.set(patient.userId, patient);
  store.memory.users.set(doctor.userId, doctor);

  const services = await listServices();
  assert.ok(services.length >= 3);
  assert.equal((await getServiceById(service.serviceId)).serviceId, service.serviceId);

  await assert.rejects(
    () => bookAppointment({ userId: patient.userId, serviceId: service.serviceId, date: '2000-01-01', time: '09:00' }),
    /upcoming/
  );

  const slot = futureSlot();
  const appointment = await bookAppointment({ userId: patient.userId, serviceId: service.serviceId, ...slot, notes: 'first visit' });
  assert.ok(appointment.appointmentId.startsWith('apt-'));
  assert.equal(appointment.status, 'PENDING_APPROVAL');
  assert.equal(appointment.doctorId, doctor.userId);
  assert.equal(appointment.patientEmail, patient.email);

  assert.equal((await listAppointments({ userId: patient.userId, role: 'patient' })).length, 1);
  assert.equal((await listAppointments({ userId: doctor.userId, role: 'doctor' })).length, 1);
  assert.equal((await listAppointments({ userId: 'coord', role: 'coordinator' })).length, 1);
  await assert.rejects(() => listAppointments({}), /Authentication required/);

  await assert.rejects(
    () => updateAppointment(appointment.appointmentId, { userId: patient.userId, role: 'patient', status: 'CONFIRMED' }),
    /Doctor or coordinator access required/
  );
  const confirmed = await updateAppointment(appointment.appointmentId, { userId: doctor.userId, role: 'doctor', status: 'CONFIRMED' });
  assert.equal(confirmed.status, 'CONFIRMED');

  const added = await upsertService({ userId: 'coord', role: 'coordinator', name: 'Therapy Session', price: '80', durationMinutes: '45' });
  assert.equal(added.name, 'Therapy Session');
  assert.equal(added.price, 80);
  await assert.rejects(() => upsertService({ userId: patient.userId, role: 'patient', name: 'Blocked' }), /Coordinator access required/);
}

run().then(() => console.log('appointment tests passed')).catch((error) => {
  console.error(error);
  process.exit(1);
});