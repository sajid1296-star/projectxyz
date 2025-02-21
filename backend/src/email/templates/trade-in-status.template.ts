export const tradeInStatusTemplate = {
  pending: {
    subject: 'Ihre Ankauf-Anfrage wurde erfolgreich erstellt',
    template: `
      Sehr geehrte(r) {{firstName}} {{lastName}},

      vielen Dank für Ihre Ankauf-Anfrage (ID: {{tradeInId}}).

      Details Ihrer Anfrage:
      - Gerät: {{deviceType}}
      - Marke: {{brand}}
      - Modell: {{model}}
      - Geschätzter Wert: {{estimatedPrice}}€

      Wir werden Ihre Anfrage schnellstmöglich prüfen und Sie über den weiteren Verlauf informieren.

      Mit freundlichen Grüßen
      Ihr Ankauf-Team
    `
  },

  approved: {
    subject: 'Ihre Ankauf-Anfrage wurde genehmigt',
    template: `
      Sehr geehrte(r) {{firstName}} {{lastName}},

      Ihre Ankauf-Anfrage (ID: {{tradeInId}}) wurde genehmigt.

      Bitte senden Sie Ihr Gerät an folgende Adresse:
      {{companyName}}
      {{companyAddress}}

      Wichtige Hinweise:
      - Bitte legen Sie einen Ausdruck dieser E-Mail bei
      - Entfernen Sie alle persönlichen Daten vom Gerät
      - Deaktivieren Sie "Mein iPhone suchen" (bei Apple-Geräten)
      - Verpacken Sie das Gerät sicher

      Nach Erhalt werden wir Ihr Gerät prüfen und Sie über den finalen Ankaufspreis informieren.

      Mit freundlichen Grüßen
      Ihr Ankauf-Team
    `
  },

  received: {
    subject: 'Ihr Gerät ist bei uns eingegangen',
    template: `
      Sehr geehrte(r) {{firstName}} {{lastName}},

      wir haben Ihr Gerät (ID: {{tradeInId}}) erhalten und werden es nun einer gründlichen Prüfung unterziehen.

      Sie werden in Kürze über das Ergebnis der Prüfung informiert.

      Mit freundlichen Grüßen
      Ihr Ankauf-Team
    `
  },

  inspected: {
    subject: 'Prüfung Ihres Geräts abgeschlossen',
    template: `
      Sehr geehrte(r) {{firstName}} {{lastName}},

      die Prüfung Ihres Geräts (ID: {{tradeInId}}) wurde abgeschlossen.

      Ergebnis der Prüfung:
      - Zustand: {{condition}}
      - Finaler Ankaufspreis: {{finalPrice}}€
      {{#if notes}}
      - Anmerkungen: {{notes}}
      {{/if}}

      Bitte bestätigen Sie den finalen Ankaufspreis in Ihrem Kundenkonto.

      Mit freundlichen Grüßen
      Ihr Ankauf-Team
    `
  },

  completed: {
    subject: 'Ankauf abgeschlossen - Zahlung veranlasst',
    template: `
      Sehr geehrte(r) {{firstName}} {{lastName}},

      der Ankauf Ihres Geräts (ID: {{tradeInId}}) wurde erfolgreich abgeschlossen.

      Die Zahlung von {{finalPrice}}€ wurde veranlasst und wird in den nächsten 
      Tagen auf Ihrem Konto gutgeschrieben.

      Wir bedanken uns für Ihr Vertrauen!

      Mit freundlichen Grüßen
      Ihr Ankauf-Team
    `
  },

  rejected: {
    subject: 'Ankauf-Anfrage nicht möglich',
    template: `
      Sehr geehrte(r) {{firstName}} {{lastName}},

      leider können wir Ihre Ankauf-Anfrage (ID: {{tradeInId}}) nicht annehmen.

      Grund:
      {{rejectionReason}}

      Falls Sie Fragen haben, kontaktieren Sie uns gerne.

      Mit freundlichen Grüßen
      Ihr Ankauf-Team
    `
  }
}; 