const { config, memory, scanItems, putItem, mirrorToFirestore } = require('./store');
const { createId, nowIso, requireCoordinatorContext } = require('./util');

const defaultServices = [
  {
    serviceId: 'consultation-general',
    name: 'General Healthcare Consultation',
    category: 'Healthcare',
    specialist: 'Family Physician',
    price: 65,
    durationMinutes: 30,
    availability: 'Mon-Fri, 09:00-17:00',
    description: 'Routine consultation, symptoms review, and follow-up planning.'
  },
  {
    serviceId: 'wellness-nutrition',
    name: 'Nutrition Wellness Session',
    category: 'Wellness',
    specialist: 'Nutrition Coach',
    price: 45,
    durationMinutes: 45,
    availability: 'Tue/Thu, 10:00-16:00',
    description: 'Personalized wellness goals, meal planning, and progress review.'
  },
  {
    serviceId: 'mental-wellness',
    name: 'Mental Wellness Check-in',
    category: 'Wellness',
    specialist: 'Wellness Counsellor',
    price: 55,
    durationMinutes: 30,
    availability: 'Mon/Wed/Fri, 12:00-18:00',
    description: 'Confidential support, stress screening, and resource navigation.'
  }
];

for (const service of defaultServices) {
  if (!memory.services.get(service.serviceId)) memory.services.set(service.serviceId, service);
}

async function listServices() {
  const items = await scanItems(config.servicesTable, memory.services);
  return items.length ? items : defaultServices;
}

async function getServiceById(serviceId) {
  const services = await listServices();
  return services.find((service) => service.serviceId === serviceId) || null;
}

async function upsertService(service) {
  requireCoordinatorContext(service);
  const serviceId = service.serviceId || createId('svc');
  const item = {
    serviceId,
    name: service.name,
    category: service.category || 'Wellness',
    specialist: service.specialist || 'Coordinator',
    price: Number(service.price || 0),
    durationMinutes: Number(service.durationMinutes || 30),
    availability: service.availability || 'By appointment',
    description: service.description || '',
    updatedAt: nowIso()
  };
  if (!item.name) throw new Error('service name is required');
  await putItem(config.servicesTable, 'serviceId', item, memory.services);
  await mirrorToFirestore('services', serviceId, item);
  return item;
}

module.exports = { defaultServices, listServices, getServiceById, upsertService };
