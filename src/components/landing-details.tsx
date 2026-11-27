import { ChevronDown } from 'lucide-react'
import type { Copy } from '../i18n'

const parliament = 'https://sansad.in/getFile/annex/267/AU1505_YvQaNC.pdf?source=pqars'
const enforcement = 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/may/doc202551549501.pdf#page=51'

export function LandingDetails({ copy }: { copy: Copy }) {
  const c = copy.more
  return (
    <>
      <section className="guide-block" aria-labelledby="faq-title">
        <h2 id="faq-title" data-read>{c.faq}</h2>
        <div className="faq-list">{c.entries.map(([question, answer]) =>
          <details className="glass-card" key={question}>
            <summary data-read>{question}<ChevronDown aria-hidden="true" /></summary>
            <p data-read>{answer}</p>
          </details>
        )}</div>
      </section>
      <section className="guide-block" aria-labelledby="facts-title">
        <h2 id="facts-title" data-read>{c.facts}</h2>
        <div className="promise-grid">{c.figures.map(([figure, description], index) =>
          <article className="glass-card fact-card" key={figure}>
            <strong data-read>{figure}</strong>
            <p data-read>{description}</p>
            <a href={index === 2 ? enforcement : parliament}>{index === 2 ? c.ed : c.parliament}</a>
          </article>
        )}</div>
      </section>
      <footer className="landing-footer">
        <div className="landing-tools">
          <a href="tel:1930">{copy.helpline}</a>
          <a href="https://cybercrime.gov.in">cybercrime.gov.in</a>
          <a href="#privacy">{copy.landing.privacyTitle}</a>
          <a href="https://github.com/Farazuddin178/callguard">{c.github}</a>
        </div>
        <p data-read>{c.credit}</p>
      </footer>
    </>
  )
}
