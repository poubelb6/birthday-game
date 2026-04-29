export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 16, lineHeight: 1.7, color: '#1e293b', background: '#f8fafc', padding: '0 16px 64px', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <header style={{ padding: '40px 0 32px', borderBottom: '2px solid #0f172a', marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#FF4B4B' }}>
            Birthday<span style={{ color: '#0f172a' }}>Game</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>Politique de confidentialité</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Dernière mise à jour : 30 avril 2026 &nbsp;·&nbsp;
            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#fef2f2', color: '#FF4B4B', border: '1px solid #fecaca' }}>v1.0</span>
          </p>
        </header>

        <Section title="1. Qui sommes-nous ?">
          <p style={p}>
            Birthday Game est une application mobile développée par Amine Ezzeyadi
            (<a href="mailto:ezzeyadiamine@gmail.com" style={{ color: '#FF4B4B' }}>ezzeyadiamine@gmail.com</a>).
            Elle permet de collecter les anniversaires de vos proches, de recevoir des rappels
            et de débloquer des cartes collectionables.
          </p>
        </Section>

        <Section title="2. Données collectées">
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: 14 }}>
            <thead>
              <tr>
                {['Donnée', 'Source', 'Finalité', 'Durée'].map(h => (
                  <th key={h} style={{ background: '#0f172a', color: '#fff', textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Nom, email, photo', 'Connexion Google', 'Authentification, profil', "Jusqu'à suppression du compte"],
                ['Date de naissance', 'Onboarding', 'Signe zodiacal, profil partageable', "Jusqu'à suppression du compte"],
                ['Anniversaires d\'amis', 'Saisie manuelle / QR', 'Rappels, fonctionnalités', "Jusqu'à suppression de l'entrée"],
                ['Messages in-app', 'Messagerie', 'Communication entre utilisateurs', "Jusqu'à suppression du compte"],
                ['Token FCM', 'Appareil Android', 'Notifications push', 'Renouvelé par Firebase'],
                ['XP, cartes, défis', 'Actions dans l\'app', 'Gamification', "Jusqu'à suppression du compte"],
              ].map(([d, s, f, dur], i) => (
                <tr key={i}>
                  {[d, s, f, dur].map((cell, j) => (
                    <td key={j} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: i % 2 === 1 ? '#f1f5f9' : 'white' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={p}>Nous ne collectons <strong>aucune donnée de localisation</strong>, aucune donnée de santé, et n'effectuons aucun profilage publicitaire.</p>
        </Section>

        <Section title="3. Base légale (RGPD)">
          <ul style={ul}>
            <li style={li}><strong>Exécution du contrat</strong> : données nécessaires au fonctionnement (authentification, anniversaires, notifications)</li>
            <li style={li}><strong>Consentement</strong> : notifications push (désactivables dans les paramètres)</li>
            <li style={li}><strong>Intérêt légitime</strong> : amélioration de l'application</li>
          </ul>
        </Section>

        <Section title="4. Partage des données">
          <p style={p}>Vos données sont hébergées sur <strong>Firebase (Google LLC)</strong>, basé aux États-Unis, certifié conforme au cadre EU-US Data Privacy Framework. Aucune donnée n'est vendue à des tiers.</p>
          <p style={p}>Les seules données visibles par d'autres utilisateurs sont celles que vous partagez via votre QR code (nom, date de naissance, photo, réseaux sociaux).</p>
        </Section>

        <Section title="5. Vos droits">
          <ul style={ul}>
            <li style={li}><strong>Accès</strong> : demander une copie de vos données</li>
            <li style={li}><strong>Rectification</strong> : modifier vos informations depuis le profil</li>
            <li style={li}><strong>Suppression</strong> : Paramètres → Supprimer le compte (cascade complète)</li>
            <li style={li}><strong>Opposition</strong> : désactiver les notifications dans les Paramètres</li>
            <li style={li}><strong>Portabilité</strong> : nous contacter pour obtenir vos données en JSON</li>
          </ul>
          <p style={p}>Contact : <a href="mailto:ezzeyadiamine@gmail.com" style={{ color: '#FF4B4B' }}>ezzeyadiamine@gmail.com</a></p>
        </Section>

        <Section title="6. Sécurité">
          <p style={p}>
            Les données sont protégées par les règles Firestore (accès limité à votre UID),
            la connexion HTTPS et l'authentification Google OAuth 2.0.
            Aucune clé d'API n'est exposée dans l'application.
          </p>
        </Section>

        <Section title="7. Mineurs">
          <p style={p}>L'application est destinée aux personnes de 13 ans et plus. Nous ne collectons pas sciemment de données sur des enfants de moins de 13 ans.</p>
        </Section>

        <Section title="8. Modifications">
          <p style={p}>En cas de modification substantielle de cette politique, vous serez informé dans l'application. La date de mise à jour figure en haut de cette page.</p>
        </Section>

        <footer style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
          <p>Birthday Game &nbsp;·&nbsp; <a href="mailto:ezzeyadiamine@gmail.com" style={{ color: '#FF4B4B' }}>ezzeyadiamine@gmail.com</a> &nbsp;·&nbsp; v1.0</p>
        </footer>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '36px 0 12px', paddingLeft: 12, borderLeft: '3px solid #FF4B4B' }}>{title}</h2>
      {children}
    </div>
  );
}

const p: React.CSSProperties = { marginBottom: 12, color: '#334155' };
const ul: React.CSSProperties = { margin: '8px 0 12px 20px' };
const li: React.CSSProperties = { marginBottom: 6, color: '#334155' };
