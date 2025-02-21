export const tradeInHTMLTemplate = {
  baseLayout: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{{subject}}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 2px solid #eee;
        }
        .logo {
          max-width: 200px;
          height: auto;
        }
        .content {
          padding: 30px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #eee;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #007bff;
          color: #ffffff;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        }
        .info-box {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0;
        }
        .price {
          font-size: 24px;
          font-weight: bold;
          color: #28a745;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        .highlight {
          background-color: #fff3cd;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="{{logoUrl}}" alt="{{companyName}}" class="logo">
        </div>
        <div class="content">
          {{content}}
        </div>
        <div class="footer">
          <p>{{companyName}}</p>
          <p>{{companyAddress}}</p>
          <p>© {{currentYear}} {{companyName}}. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  pending: {
    subject: 'Ihre Ankauf-Anfrage wurde erfolgreich erstellt',
    content: `
      <h2>Ankauf-Anfrage bestätigt</h2>
      <p>Sehr geehrte(r) {{firstName}} {{lastName}},</p>
      <p>vielen Dank für Ihre Ankauf-Anfrage.</p>
      
      <div class="info-box">
        <h3>Ihre Anfrage-Details</h3>
        <table>
          <tr>
            <td>Anfrage-ID:</td>
            <td><strong>{{tradeInId}}</strong></td>
          </tr>
          <tr>
            <td>Gerät:</td>
            <td>{{deviceType}}</td>
          </tr>
          <tr>
            <td>Marke:</td>
            <td>{{brand}}</td>
          </tr>
          <tr>
            <td>Modell:</td>
            <td>{{model}}</td>
          </tr>
          <tr>
            <td>Geschätzter Wert:</td>
            <td class="price">{{estimatedPrice}}€</td>
          </tr>
        </table>
      </div>

      <p>Wir werden Ihre Anfrage schnellstmöglich prüfen und Sie über den weiteren Verlauf informieren.</p>

      <a href="{{dashboardUrl}}" class="button">Zum Dashboard</a>
    `
  },

  approved: {
    subject: 'Ihre Ankauf-Anfrage wurde genehmigt',
    content: `
      <h2>Ankauf-Anfrage genehmigt</h2>
      <p>Sehr geehrte(r) {{firstName}} {{lastName}},</p>
      <p>Ihre Ankauf-Anfrage (ID: {{tradeInId}}) wurde genehmigt.</p>

      <div class="info-box">
        <h3>Versandadresse</h3>
        <p>
          {{companyName}}<br>
          {{companyAddress}}
        </p>
      </div>

      <div class="highlight">
        <h3>Wichtige Hinweise</h3>
        <ul>
          <li>Bitte legen Sie einen Ausdruck dieser E-Mail bei</li>
          <li>Entfernen Sie alle persönlichen Daten vom Gerät</li>
          <li>Deaktivieren Sie "Mein iPhone suchen" (bei Apple-Geräten)</li>
          <li>Verpacken Sie das Gerät sicher</li>
        </ul>
      </div>

      <p>Nach Erhalt werden wir Ihr Gerät prüfen und Sie über den finalen Ankaufspreis informieren.</p>
    `
  },

  received: {
    subject: 'Ihr Gerät ist bei uns eingegangen',
    content: `
      <h2>Gerät eingegangen</h2>
      <p>Sehr geehrte(r) {{firstName}} {{lastName}},</p>
      
      <div class="status-badge" style="background-color: #cce5ff; color: #004085;">
        Gerät erhalten
      </div>

      <p>wir haben Ihr Gerät (ID: {{tradeInId}}) erhalten und werden es nun einer gründlichen Prüfung unterziehen.</p>

      <div class="info-box">
        <p>Sie werden in Kürze über das Ergebnis der Prüfung informiert.</p>
      </div>
    `
  },

  inspected: {
    subject: 'Prüfung Ihres Geräts abgeschlossen',
    content: `
      <h2>Prüfung abgeschlossen</h2>
      <p>Sehr geehrte(r) {{firstName}} {{lastName}},</p>
      
      <p>die Prüfung Ihres Geräts (ID: {{tradeInId}}) wurde abgeschlossen.</p>

      <div class="info-box">
        <h3>Prüfungsergebnis</h3>
        <table>
          <tr>
            <td>Zustand:</td>
            <td>{{condition}}</td>
          </tr>
          <tr>
            <td>Finaler Ankaufspreis:</td>
            <td class="price">{{finalPrice}}€</td>
          </tr>
          {{#if notes}}
          <tr>
            <td>Anmerkungen:</td>
            <td>{{notes}}</td>
          </tr>
          {{/if}}
        </table>
      </div>

      <p>Bitte bestätigen Sie den finalen Ankaufspreis in Ihrem Kundenkonto.</p>
      <a href="{{dashboardUrl}}" class="button">Jetzt bestätigen</a>
    `
  },

  completed: {
    subject: 'Ankauf abgeschlossen - Zahlung veranlasst',
    content: `
      <h2>Ankauf erfolgreich abgeschlossen</h2>
      <p>Sehr geehrte(r) {{firstName}} {{lastName}},</p>

      <div class="status-badge" style="background-color: #d4edda; color: #155724;">
        Ankauf abgeschlossen
      </div>

      <p>der Ankauf Ihres Geräts (ID: {{tradeInId}}) wurde erfolgreich abgeschlossen.</p>

      <div class="info-box">
        <h3>Zahlungsdetails</h3>
        <p>Die Zahlung von <span class="price">{{finalPrice}}€</span> wurde veranlasst und wird in den nächsten Tagen auf Ihrem Konto gutgeschrieben.</p>
      </div>

      <p>Wir bedanken uns für Ihr Vertrauen!</p>
    `
  },

  rejected: {
    subject: 'Ankauf-Anfrage nicht möglich',
    content: `
      <h2>Ankauf-Anfrage nicht möglich</h2>
      <p>Sehr geehrte(r) {{firstName}} {{lastName}},</p>

      <div class="status-badge" style="background-color: #f8d7da; color: #721c24;">
        Nicht möglich
      </div>

      <p>leider können wir Ihre Ankauf-Anfrage (ID: {{tradeInId}}) nicht annehmen.</p>

      <div class="info-box">
        <h3>Grund</h3>
        <p>{{rejectionReason}}</p>
      </div>

      <p>Falls Sie Fragen haben, kontaktieren Sie uns gerne.</p>
      <a href="{{supportUrl}}" class="button">Support kontaktieren</a>
    `
  }
}; 