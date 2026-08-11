import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useApi } from '../../api/client';
import { PackageCard } from '../../components/PackageCard';
import { DoctorCard } from '../../components/DoctorCard';

export function LandingPage() {
  const { request } = useApi();
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [servicesData, doctorsData, summaryData] = await Promise.all([
          request('/services'),
          request('/doctors'),
          request('/feedback/summary')
        ]);
        if (cancelled) return;
        setServices(servicesData);
        setDoctors(doctorsData);
        setFeedbackSummary(summaryData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [request]);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Healthcare appointments and wellness support</p>
          <h1>SmartCare Appointment and Wellness System</h1>
          <p>Coordinated healthcare appointments, wellness services, and patient support in one secure system.</p>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Healthcare and Wellness Services</h2>
            <p>Care options, specialists, timings, and service charges.</p>
          </div>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <PackageCard service={service} key={service.serviceId || service.name} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Doctors &amp; Specialists</h2>
            <p>Approved specialists and current weekly availability.</p>
          </div>
        </div>
        <div className="service-grid">
          {doctors.map((doctor) => (
            <DoctorCard doctor={doctor} key={doctor.userId} />
          ))}
          {!doctors.length && <p className="empty">No specialists are currently listed.</p>}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Feedback &amp; Sentiment Overview</h2>
            <p>Recent service feedback and sentiment trends.</p>
          </div>
        </div>
        {feedbackSummary && feedbackSummary.totalReviews ? (
          <div className="analytics-grid">
            <div className="stats wide">
              <div className="stat">
                <Activity size={18} />
                <strong>{feedbackSummary.totalReviews}</strong>
                <span>Total reviews</span>
              </div>
              <div className="stat">
                <Activity size={18} />
                <strong>{feedbackSummary.averageRating.toFixed(1)} / 5</strong>
                <span>Average rating</span>
              </div>
              <div className="stat">
                <Activity size={18} />
                <strong>{feedbackSummary.averageSentiment.toFixed(2)}</strong>
                <span>Average sentiment</span>
              </div>
            </div>
            <div className="panel wide">
              <h3>Recent comments</h3>
              <div className="table scroll-area">
                {feedbackSummary.recent.map((item, index) => (
                  <div className="row" key={index}>
                    <span>{item.service}</span>
                    <span>Rating {item.rating}/5</span>
                    <span>Sentiment {Number(item.sentimentScore).toFixed(2)}</span>
                    <span>{item.comment}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="empty">No feedback submitted yet.</p>
        )}
      </section>
    </>
  );
}



