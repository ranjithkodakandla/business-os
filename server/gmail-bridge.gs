/**
 * Gmail / Apps Script bridge for supplier sourcing.
 *
 * Setup:
 * 1. In the Apps Script project: Project Settings → Script properties
 * 2. Add property BRIDGE_SECRET with a long random value
 * 3. Configure the same value on the sourcing server (Secret Manager / env)
 * 4. Do not commit secrets into this file
 *
 * Deploy as a web app that executes as you and is accessible to anyone with the URL
 * only if the request carries the matching key.
 */

function doPost(e) {
  return handle_(e);
}

function doGet(e) {
  return handle_(e);
}

function handle_(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('BRIDGE_SECRET');
  if (!secret) {
    return json_({ ok: false, error: 'BRIDGE_SECRET is not configured in Script properties' });
  }

  var req = null;
  try {
    if (e && e.postData && e.postData.contents) {
      req = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      req = e.parameter;
    }
  } catch (err) {
    return json_({ ok: false, error: 'invalid json' });
  }

  if (!req || req.key !== secret) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  // Preserve prior bridge behavior: echo acknowledged actions for the sourcing agent.
  return json_({
    ok: true,
    received: {
      action: req.action || null,
      threadId: req.threadId || null,
      messageId: req.messageId || null
    }
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
