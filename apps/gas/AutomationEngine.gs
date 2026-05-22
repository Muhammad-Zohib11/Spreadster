// ============================================================
// SPREADSTER — Automation Engine (AutomationEngine.gs)
// Triggers, email notifications, dialogs, toasts
// ============================================================

var AutomationEngine = (function() {

  function ok(msg) { return { success: true, message: msg || 'OK' }; }
  function err(e, ctx) { return { success: false, error: (ctx || '') + ': ' + e.toString() }; }

  // ============================================================
  // EMAIL
  // ============================================================

  function sendEmail(op) {
    try {
      if (!op.to || !op.subject) {
        return { success: false, error: 'sendEmail: missing required fields "to" and "subject"' };
      }
      var options = {};
      if (op.htmlBody) options.htmlBody = op.htmlBody;
      if (op.attachSpreadsheet) {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var blob = ss.getAs('application/pdf');
        blob.setName((op.attachmentName || ss.getName()) + '.pdf');
        options.attachments = [blob];
      }
      MailApp.sendEmail(op.to, op.subject, op.body || '', options);
      return ok('Email sent to: ' + op.to);
    } catch(e) { return err(e, 'sendEmail'); }
  }

  // ============================================================
  // TRIGGERS
  // ============================================================

  function createTrigger(op) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var trigger;
      var eventType = (op.eventType || '').toUpperCase();

      if (eventType === 'ON_EDIT') {
        trigger = ScriptApp.newTrigger('onEditTrigger')
          .forSpreadsheet(ss)
          .onEdit()
          .create();
      } else if (eventType === 'ON_CHANGE') {
        trigger = ScriptApp.newTrigger('onEditTrigger')
          .forSpreadsheet(ss)
          .onChange()
          .create();
      } else if (eventType === 'ON_FORM_SUBMIT') {
        trigger = ScriptApp.newTrigger('onFormSubmitTrigger')
          .forSpreadsheet(ss)
          .onFormSubmit()
          .create();
      } else if (eventType === 'TIME_DRIVEN' && op.intervalMinutes) {
        trigger = ScriptApp.newTrigger('onTimeDrivenTrigger')
          .timeBased()
          .everyMinutes(op.intervalMinutes)
          .create();
      } else if (eventType === 'DAILY' && op.atHour !== undefined) {
        trigger = ScriptApp.newTrigger('onTimeDrivenTrigger')
          .timeBased()
          .atHour(op.atHour)
          .everyDays(1)
          .inTimezone(op.timezone || Session.getScriptTimeZone())
          .create();
      } else if (eventType === 'WEEKLY' && op.weekDay && op.atHour !== undefined) {
        var dayMap = {
          MONDAY: ScriptApp.WeekDay.MONDAY,
          TUESDAY: ScriptApp.WeekDay.TUESDAY,
          WEDNESDAY: ScriptApp.WeekDay.WEDNESDAY,
          THURSDAY: ScriptApp.WeekDay.THURSDAY,
          FRIDAY: ScriptApp.WeekDay.FRIDAY,
          SATURDAY: ScriptApp.WeekDay.SATURDAY,
          SUNDAY: ScriptApp.WeekDay.SUNDAY
        };
        trigger = ScriptApp.newTrigger('onTimeDrivenTrigger')
          .timeBased()
          .onWeekDay(dayMap[op.weekDay.toUpperCase()] || ScriptApp.WeekDay.MONDAY)
          .atHour(op.atHour)
          .create();
      } else {
        return { success: false, error: 'Unknown trigger eventType: ' + eventType };
      }

      // Store trigger metadata in script properties for reference
      var props = PropertiesService.getScriptProperties();
      var triggers = JSON.parse(props.getProperty('SPREADSTER_TRIGGERS') || '[]');
      triggers.push({
        id: trigger.getUniqueId(),
        eventType: eventType,
        description: op.description || eventType,
        createdAt: new Date().toISOString()
      });
      props.setProperty('SPREADSTER_TRIGGERS', JSON.stringify(triggers));

      return ok('Trigger created: ' + eventType + ' (ID: ' + trigger.getUniqueId() + ')');
    } catch(e) { return err(e, 'createTrigger'); }
  }

  function deleteTrigger(op) {
    try {
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getUniqueId() === op.triggerId) {
          ScriptApp.deleteTrigger(triggers[i]);
          return ok('Trigger deleted');
        }
      }
      return { success: false, error: 'Trigger not found: ' + op.triggerId };
    } catch(e) { return err(e, 'deleteTrigger'); }
  }

  // ============================================================
  // UI FEEDBACK
  // ============================================================

  function showToast(op) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        op.message || '',
        op.title || 'SPREADSTER',
        op.timeoutSeconds || 5
      );
      return ok('Toast shown');
    } catch(e) { return err(e, 'showToast'); }
  }

  function showDialog(op) {
    try {
      var html = HtmlService.createHtmlOutput('<p>' + (op.message || '') + '</p>')
        .setWidth(op.width || 300)
        .setHeight(op.height || 150);
      SpreadsheetApp.getUi().showModalDialog(html, op.title || 'SPREADSTER');
      return ok('Dialog shown');
    } catch(e) { return err(e, 'showDialog'); }
  }

  // ============================================================
  // TRIGGER EVENT HANDLERS (called from Code.gs)
  // ============================================================

  function handleOnEdit(e) {
    try {
      AuditLogger.log('TRIGGER_ON_EDIT', 'SUCCESS', {
        range: e && e.range ? e.range.getA1Notation() : null,
        sheet: e && e.source ? e.source.getActiveSheet().getName() : null
      });
    } catch(ex) { /* ignore */ }
  }

  function handleOnFormSubmit(e) {
    try {
      AuditLogger.log('TRIGGER_FORM_SUBMIT', 'SUCCESS', {
        values: e ? e.values : null
      });
    } catch(ex) { /* ignore */ }
  }

  function handleTimeDriven() {
    try {
      AuditLogger.log('TRIGGER_TIME_DRIVEN', 'SUCCESS', {});
    } catch(ex) { /* ignore */ }
  }

  return {
    sendEmail: sendEmail,
    createTrigger: createTrigger,
    deleteTrigger: deleteTrigger,
    showToast: showToast,
    showDialog: showDialog,
    handleOnEdit: handleOnEdit,
    handleOnFormSubmit: handleOnFormSubmit,
    handleTimeDriven: handleTimeDriven
  };

})();
