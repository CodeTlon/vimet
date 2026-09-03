import Script from 'next/script'

interface GoogleAnalyticsProps {
  gaId: string
}

/**
 * GA4 + Consent Mode v2. Arranca en 'denied' hasta que el usuario elige en
 * CookieConsent; si ya eligió antes (localStorage), respeta esa elección
 * desde el primer render para no re-pedir consentimiento en cada visita.
 */
export default function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          var consent = (function(){ try { return localStorage.getItem('vimet_cookie_consent'); } catch (e) { return null; } })();
          var granted = consent === 'granted' ? 'granted' : 'denied';
          gtag('consent', 'default', {
            analytics_storage: granted,
            ad_storage: granted,
            ad_user_data: granted,
            ad_personalization: granted,
          });
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  )
}
