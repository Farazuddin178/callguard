import { CaretDown, LockKey, Phone, ShieldCheck } from '@phosphor-icons/react'
import type { Copy } from '../i18n'
import { Button } from './ui/button'

const parliament = 'https://sansad.in/getFile/annex/267/AU1505_YvQaNC.pdf?source=pqars'
const enforcement = 'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/may/doc202551549501.pdf#page=51'

export function LandingDetails({ copy, openPrivacy }: { copy: Copy; openPrivacy: () => void }) {
  const c = copy.more

  return <>
    <section className="privacy-editorial" id="privacy" aria-labelledby="privacy-title">
      <h2 id="privacy-title" data-read>{copy.landing.privacyTitle}</h2>
      <ul role="list">{copy.landing.promises.map(promise => <li key={promise} data-read>{promise}</li>)}</ul>
      <Button variant="ghost" onClick={openPrivacy}><LockKey aria-hidden="true" />{copy.privacy}</Button>
    </section>

    <section className="help-band" aria-labelledby="danger-title">
      <div className="page-width">
        <div><h2 id="danger-title" data-read>{copy.landing.danger}</h2><p data-read>{copy.landing.national}</p></div>
        <Button asChild className="help-call"><a href="tel:1930"><Phone aria-hidden="true" />{copy.helpline}</a></Button>
        <div><p data-read>{copy.landing.report}</p><a className="large-link" href="https://cybercrime.gov.in">cybercrime.gov.in</a></div>
      </div>
    </section>

    <section className="facts-section" aria-labelledby="facts-title">
      <h2 id="facts-title" data-read>{c.facts}</h2>
      <dl className="fact-row">{c.figures.map(([figure, description], index) =>
        <div key={figure}>
          <dt data-read>{figure}</dt>
          <dd data-read>{description}</dd>
          <dd><a className="large-link" href={index === 2 ? enforcement : parliament}>{index === 2 ? c.ed : c.parliament}</a></dd>
        </div>)}</dl>
    </section>

    <section className="faq-section" aria-labelledby="faq-title">
      <h2 id="faq-title" data-read>{c.faq}</h2>
      <div className="faq-list">{c.entries.map(([question, answer]) =>
        <details key={question}>
          <summary data-read>{question}<CaretDown aria-hidden="true" /></summary>
          <p data-read>{answer}</p>
        </details>)}</div>
    </section>
  </>
}

export function LandingFooter({ copy }: { copy: Copy }) {
  return <footer className="landing-footer">
    <div className="footer-inner page-width">
      <p className="footer-brand"><ShieldCheck aria-hidden="true" />{copy.brand}</p>
      <nav>
        <a className="large-link" href="tel:1930">{copy.helpline}</a>
        <a className="large-link" href="https://cybercrime.gov.in">cybercrime.gov.in</a>
        <a className="large-link" href="#privacy">{copy.landing.privacyTitle}</a>
        <a className="large-link" href="#/guide">{copy.guide.title}</a>
        <a className="large-link" href="https://github.com/Farazuddin178/callguard">{copy.more.github}</a>
        <a className="large-link" href="https://github.com/MengTo/threeui">{copy.more.credit}</a>
      </nav>
    </div>
  </footer>
}
