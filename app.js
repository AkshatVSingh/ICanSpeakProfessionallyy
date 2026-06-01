(function () {
  'use strict';

  const STORAGE_KEY = 'icanspeakprofessionally.history.v1';
  const MAX_HISTORY = 8;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const rawInput = $('#rawInput');
  const formatSelect = $('#formatSelect');
  const toneSelect = $('#toneSelect');
  const recipientInput = $('#recipientInput');
  const senderInput = $('#senderInput');
  const includeSubject = $('#includeSubject');
  const includeExplanation = $('#includeExplanation');
  const saveHistory = $('#saveHistory');
  const outputBox = $('#outputBox');
  const notesBox = $('#notesBox');
  const detectedIntent = $('#detectedIntent');
  const detectedUrgency = $('#detectedUrgency');
  const toneCards = $('#toneCards');
  const historyList = $('#historyList');
  const toast = $('#toast');

  const toneLabels = {
    polite: 'Polite',
    formal: 'Formal',
    concise: 'Concise',
    assertive: 'Assertive',
    warm: 'Warm'
  };

  const intentRules = [
    { id: 'payment_follow_up', label: 'Payment follow-up', words: ['payment', 'invoice', 'paid', 'clear', 'pending amount', 'dues'] },
    { id: 'apology', label: 'Apology', words: ['sorry', 'apologize', 'apology', 'missed', 'forgot', 'mistake', 'delay from my side'] },
    { id: 'reschedule', label: 'Reschedule', words: ['reschedule', 'move it', 'postpone', 'cannot join', 'can we move', 'another time'] },
    { id: 'complaint', label: 'Concern or complaint', words: ['ridiculous', 'not okay', 'unacceptable', 'problem', 'issue', 'complaint', 'disappointed'] },
    { id: 'follow_up', label: 'Follow-up', words: ['follow up', 'following up', 'third time', 'again asking', 'reminder', 'checking'] },
    { id: 'request', label: 'Request', words: ['send', 'share', 'need', 'can you', 'could you', 'please give', 'require'] },
    { id: 'leave', label: 'Leave request', words: ['leave', 'sick', 'unwell', 'absent', 'day off'] },
    { id: 'update', label: 'Status update', words: ['update', 'done', 'completed', 'finished', 'progress', 'status'] }
  ];

  const replacements = [
    [/(^|\s)u(\s|$)/gi, '$1you$2'],
    [/(^|\s)ur(\s|$)/gi, '$1your$2'],
    [/\bpls\b|\bplz\b/gi, 'please'],
    [/\basap\b/gi, 'as soon as possible'],
    [/\btbh\b/gi, 'to be transparent'],
    [/\bidk\b/gi, 'I am not sure'],
    [/\bim\b/gi, 'I am'],
    [/\bcant\b/gi, 'cannot'],
    [/\bwont\b/gi, 'will not'],
    [/\bdont\b/gi, 'do not'],
    [/\bdidnt\b/gi, 'did not'],
    [/\bthx\b|\bthanks\b/gi, 'thank you'],
    [/\bgimme\b/gi, 'please share'],
    [/\bgotta\b/gi, 'need to'],
    [/\bwanna\b/gi, 'want to'],
    [/\bkinda\b/gi, 'somewhat'],
    [/\bthis is getting ridiculous\b/gi, 'this matter has been pending longer than expected'],
    [/\byou guys\b/gi, 'your team'],
    [/\bfix this\b/gi, 'please look into this and help resolve it'],
    [/\bno idea\b/gi, 'I am currently unclear'],
    [/\bforgot\b/gi, 'overlooked it']
  ];

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function cleanInput(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.!?])/g, '$1')
      .trim();
  }

  function sentenceCase(text) {
    const cleaned = cleanInput(text).toLowerCase();
    if (!cleaned) return '';
    return cleaned.replace(/(^\s*\w|[.!?]\s*\w)/g, (match) => match.toUpperCase());
  }

  function soften(text) {
    let result = text;
    replacements.forEach(([pattern, replacement]) => {
      result = result.replace(pattern, replacement);
    });
    result = result.replace(/\bnow\b/gi, 'at your earliest convenience');
    result = result.replace(/\bimmediately\b/gi, 'as soon as possible');
    result = result.replace(/\bwhy haven't you\b/gi, 'could you please update me on why');
    result = result.replace(/\bwhat the hell\b/gi, 'I am concerned');
    return sentenceCase(result);
  }

  function detectIntent(text) {
    const lower = text.toLowerCase();
    const match = intentRules.find((rule) => rule.words.some((word) => lower.includes(word)));
    return match || { id: 'general', label: 'General professional message', words: [] };
  }

  function detectUrgency(text) {
    const lower = text.toLowerCase();
    if (/\b(asap|urgent|immediately|today|by tonight|right now|without fail|eod|close of business)\b/.test(lower)) {
      return { id: 'high', label: 'High' };
    }
    if (/\b(tomorrow|this week|by friday|by monday|deadline|soon|before the meeting)\b/.test(lower)) {
      return { id: 'medium', label: 'Medium' };
    }
    return { id: 'normal', label: 'Normal' };
  }

  function extractDeadline(text) {
    const lower = text.toLowerCase();
    const patterns = [
      /by\s+(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(before|ahead of)\s+([^,.!?]+)/i,
      /(end of day|eod|close of business)/i,
      /(this week|next week)/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0].replace(/\beod\b/i, 'end of day');
    }
    if (lower.includes('as soon as possible')) return 'as soon as possible';
    return '';
  }

  function extractTopic(text, intent) {
    const lower = text.toLowerCase();
    const knownTopics = [
      ['q3 report', 'Q3 report'],
      ['report', 'report'],
      ['file', 'file'],
      ['payment', 'payment'],
      ['invoice', 'invoice'],
      ['deadline', 'deadline'],
      ['meeting', 'meeting'],
      ['call', 'call'],
      ['leave', 'leave request'],
      ['document', 'document'],
      ['approval', 'approval'],
      ['access', 'access request']
    ];
    const topic = knownTopics.find(([needle]) => lower.includes(needle));
    if (topic) return topic[1];

    const needMatch = text.match(/(?:need|require|send|share|provide|get|want)\s+(?:me\s+|the\s+|a\s+|an\s+)?([^,.!?]{3,48})/i);
    if (needMatch) return cleanInput(needMatch[1]).replace(/\b(as soon as possible|please|today|tomorrow)\b/gi, '').trim() || intent.label.toLowerCase();
    return intent.label.toLowerCase();
  }

  function subjectFor(intent, topic, urgency) {
    const urgentPart = urgency.id === 'high' ? ' - Time Sensitive' : '';
    const map = {
      payment_follow_up: `Payment Follow-Up${urgentPart}`,
      apology: `Apology Regarding ${titleCase(topic)}`,
      reschedule: `Request to Reschedule ${titleCase(topic)}`,
      complaint: `Concern Regarding ${titleCase(topic)}`,
      follow_up: `Follow-Up Regarding ${titleCase(topic)}${urgentPart}`,
      request: `Request for ${titleCase(topic)}${urgentPart}`,
      leave: `Leave Request`,
      update: `Status Update Regarding ${titleCase(topic)}`,
      general: `Professional Message Regarding ${titleCase(topic)}`
    };
    return map[intent.id] || map.general;
  }

  function titleCase(text) {
    return cleanInput(text).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  function greetingFor(format, tone, recipient) {
    if (format === 'message') {
      if (recipient) return `Hi ${recipient},`;
      return tone === 'formal' ? 'Hello,' : 'Hi,';
    }
    if (recipient) return tone === 'formal' ? `Dear ${recipient},` : `Hi ${recipient},`;
    return tone === 'formal' ? 'Dear Recipient,' : 'Hi,';
  }

  function closingFor(format, tone, sender) {
    if (format === 'message') return sender ? `\n\nThanks,\n${sender}` : '\n\nThanks';
    const close = tone === 'formal' ? 'Yours sincerely,' : tone === 'warm' ? 'Warm regards,' : 'Best regards,';
    return sender ? `\n\n${close}\n${sender}` : `\n\n${close}\n[Your Name]`;
  }

  function buildCoreParagraphs(data, tone) {
    const { original, polished, intent, urgency, deadline, topic } = data;
    const deadlinePhrase = deadline ? ` by ${deadline.replace(/^by\s+/i, '')}` : '';
    const concise = tone === 'concise';

    if (intent.id === 'payment_follow_up') {
      return tone === 'assertive'
        ? [`I am following up regarding the pending payment. This has been outstanding longer than expected, and I need a confirmed payment timeline${deadlinePhrase || ' at the earliest'}.`, 'Please confirm the payment status and expected clearance date.']
        : [`I am writing to follow up on the pending payment. I would appreciate an update on its current status${deadlinePhrase}.`, 'Please let me know if any further information is required from my side.'];
    }

    if (intent.id === 'apology') {
      return concise
        ? [`I apologize for the oversight regarding ${topic}. I am addressing it and will share the update${deadlinePhrase || ' as soon as possible'}.`]
        : [`I sincerely apologize for the oversight regarding ${topic}. I understand this may have caused inconvenience, and I take responsibility for the delay.`, `I am addressing it now and will share the required update${deadlinePhrase || ' as soon as possible'}.`];
    }

    if (intent.id === 'reschedule') {
      return concise
        ? [`I will not be able to attend the scheduled ${topic}. Could we please reschedule it${deadline ? ` for ${deadline.replace(/^by\s+/i, '')}` : ' to a suitable time'}?`]
        : [`I wanted to check whether we could reschedule the ${topic}. I will not be able to attend at the currently planned time.`, `Please let me know a suitable alternative time, and I will adjust accordingly.`];
    }

    if (intent.id === 'complaint') {
      return tone === 'assertive'
        ? [`I would like to raise a concern regarding ${topic}. The current situation is causing avoidable difficulty and needs to be addressed.`, `Please review this and confirm the next steps${deadlinePhrase || ' at the earliest'}.`]
        : [`I wanted to bring a concern to your attention regarding ${topic}. The situation has been difficult, and I would appreciate your help in resolving it professionally.`, `Please let me know how we can take this forward.`];
    }

    if (intent.id === 'follow_up') {
      return tone === 'assertive'
        ? [`I am following up again regarding ${topic}. Since this has already been pending, I would appreciate a clear update${deadlinePhrase || ' today'}.`, 'Please confirm the current status and expected completion timeline.']
        : [`I am following up regarding ${topic}. I wanted to check if there has been any update on this.`, `It would be helpful if you could share the status${deadlinePhrase}.`];
    }

    if (intent.id === 'request') {
      return concise
        ? [`Could you please share the ${topic}${deadlinePhrase}?`]
        : [`Could you please help me with the ${topic}${deadlinePhrase}? It would be very helpful for my current work.`, 'Please let me know if you need any additional context from my side.'];
    }

    if (intent.id === 'leave') {
      return concise
        ? ['I am unwell and would like to request leave. Please let me know if you need any further details.']
        : ['I am writing to request leave as I am currently unwell. I will ensure that any urgent responsibilities are managed or handed over appropriately.', 'Please let me know if any further information is required.'];
    }

    if (intent.id === 'update') {
      return concise
        ? [`Here is a brief update regarding ${topic}: ${polished}.`]
        : [`I wanted to share a status update regarding ${topic}. ${polished}`, 'Please let me know if you would like me to expand on any specific part.'];
    }

    return concise ? [polished] : [`I wanted to communicate the following professionally: ${polished}`, 'Please let me know if you need any clarification.'];
  }

  function applyTone(paragraphs, tone, urgency) {
    if (tone === 'formal') {
      return paragraphs.map((p) => p
        .replace(/Could you please/g, 'I would be grateful if you could')
        .replace(/I wanted to/g, 'I am writing to')
        .replace(/Please let me know/g, 'Kindly let me know')
        .replace(/It would be helpful/g, 'It would be appreciated')
      );
    }

    if (tone === 'concise') {
      return paragraphs.slice(0, 2).map((p) => p
        .replace(/I wanted to check whether/g, 'Can')
        .replace(/I would appreciate/g, 'Please share')
        .replace(/at your earliest convenience/g, 'soon')
      );
    }

    if (tone === 'assertive') {
      return paragraphs.map((p) => p
        .replace(/I would appreciate/g, 'I need')
        .replace(/Could you please help me with/g, 'Please share')
        .replace(/It would be helpful if you could/g, 'Please')
      ).concat(urgency.id === 'high' ? ['Please treat this as time sensitive and confirm once completed.'] : []);
    }

    if (tone === 'warm') {
      return paragraphs.map((p) => p
        .replace(/Could you please/g, 'When you get a chance, could you please')
        .replace(/I am writing to/g, 'I hope you are doing well. I am writing to')
      );
    }

    return paragraphs;
  }

  function rewrite(text, options) {
    const original = cleanInput(text);
    if (!original) {
      throw new Error('Please enter a rough draft first.');
    }

    const normalized = soften(original);
    const intent = detectIntent(original);
    const urgency = detectUrgency(original);
    const deadline = extractDeadline(normalized || original);
    const topic = extractTopic(normalized || original, intent);
    const format = options.format;
    const tone = options.tone;
    const recipient = cleanInput(options.recipient || '');
    const sender = cleanInput(options.sender || '');
    const subject = subjectFor(intent, topic, urgency);

    const data = { original, polished: normalized, intent, urgency, deadline, topic };
    const paragraphs = applyTone(buildCoreParagraphs(data, tone), tone, urgency);

    let body = '';
    if (options.includeSubject && format === 'email') {
      body += `Subject: ${subject}\n\n`;
    }

    if (format === 'notice') {
      body += paragraphs.join('\n\n');
    } else {
      body += `${greetingFor(format, tone, recipient)}\n\n${paragraphs.join('\n\n')}${closingFor(format, tone, sender)}`;
    }

    const notes = buildNotes(original, normalized, intent, urgency, deadline, topic, tone, format);
    return { body, subject, intent, urgency, deadline, topic, notes, tone, format };
  }

  function buildNotes(original, normalized, intent, urgency, deadline, topic, tone, format) {
    const notes = [];
    if (original !== normalized) notes.push('Casual words and abbreviations were expanded into professional wording.');
    notes.push(`Detected intent as ${intent.label.toLowerCase()}.`);
    notes.push(`Detected urgency as ${urgency.label.toLowerCase()}.`);
    if (deadline) notes.push(`Deadline or timing reference preserved as ${deadline}.`);
    notes.push(`Generated as ${format.replace('_', ' ')} with a ${toneLabels[tone].toLowerCase()} tone.`);
    notes.push(`Main topic estimated as ${topic}.`);
    return notes;
  }

  function renderNotes(notes) {
    if (!includeExplanation.checked) {
      notesBox.classList.add('hidden');
      notesBox.innerHTML = '';
      return;
    }
    notesBox.classList.remove('hidden');
    notesBox.innerHTML = `<h4>Rewrite notes</h4><ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function getOptions(toneOverride) {
    return {
      format: formatSelect.value,
      tone: toneOverride || toneSelect.value,
      recipient: recipientInput.value,
      sender: senderInput.value,
      includeSubject: includeSubject.checked
    };
  }

  function runRewrite(toneOverride) {
    try {
      const result = rewrite(rawInput.value, getOptions(toneOverride));
      outputBox.textContent = result.body;
      detectedIntent.textContent = result.intent.label;
      detectedUrgency.textContent = result.urgency.label;
      renderNotes(result.notes);
      if (saveHistory.checked && !toneOverride) saveToHistory(result, rawInput.value);
      return result;
    } catch (error) {
      showToast(error.message);
      return null;
    }
  }

  function generateAllTones() {
    const tones = Object.keys(toneLabels);
    const results = tones.map((tone) => {
      try { return { tone, result: rewrite(rawInput.value, getOptions(tone)) }; }
      catch (error) { showToast(error.message); return null; }
    }).filter(Boolean);

    if (!results.length) return;
    toneCards.innerHTML = results.map(({ tone, result }) => `
      <article class="tone-card">
        <h3>${toneLabels[tone]}</h3>
        <pre>${escapeHtml(result.body)}</pre>
        <button class="chip-btn tone-copy" type="button" data-copy-tone="${tone}">Copy ${toneLabels[tone]}</button>
      </article>
    `).join('');

    $$('#toneCards [data-copy-tone]').forEach((button) => {
      button.addEventListener('click', () => {
        const tone = button.getAttribute('data-copy-tone');
        const match = results.find((entry) => entry.tone === tone);
        copyText(match.result.body);
      });
    });

    const active = results.find((entry) => entry.tone === toneSelect.value) || results[0];
    outputBox.textContent = active.result.body;
    detectedIntent.textContent = active.result.intent.label;
    detectedUrgency.textContent = active.result.urgency.label;
    renderNotes(active.result.notes);
    if (saveHistory.checked) saveToHistory(active.result, rawInput.value);
    showToast('Generated all tones locally.');
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveToHistory(result, input) {
    const history = loadHistory();
    const item = {
      id: Date.now(),
      at: new Date().toLocaleString(),
      tone: toneLabels[result.tone],
      intent: result.intent.label,
      input: cleanInput(input),
      output: result.body
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...history].slice(0, MAX_HISTORY)));
    renderHistory();
  }

  function renderHistory() {
    const history = loadHistory();
    if (!history.length) {
      historyList.innerHTML = '<p class="muted">No saved rewrites yet.</p>';
      return;
    }
    historyList.innerHTML = history.map((item) => `
      <article class="history-item">
        <div class="history-item-header">
          <span>${escapeHtml(item.at)} · ${escapeHtml(item.tone)} · ${escapeHtml(item.intent)}</span>
          <button class="chip-btn" type="button" data-history-id="${item.id}">Copy</button>
        </div>
        <pre>${escapeHtml(item.output)}</pre>
      </article>
    `).join('');

    $$('[data-history-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = loadHistory().find((entry) => String(entry.id) === button.getAttribute('data-history-id'));
        if (item) copyText(item.output);
      });
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard.');
    } catch (_) {
      showToast('Copy failed. Select the text manually.');
    }
  }

  function downloadCurrent() {
    const text = outputBox.textContent.trim();
    if (!text || text === 'Your rewritten message will appear here.') {
      showToast('Generate a rewrite first.');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `professional-rewrite-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    showToast('Text file downloaded.');
  }

  function attachEvents() {
    $('#rewriteBtn').addEventListener('click', () => {
      const result = runRewrite();
      if (result) showToast('Rewrite generated locally.');
    });
    $('#allTonesBtn').addEventListener('click', generateAllTones);
    $('#copyBtn').addEventListener('click', () => copyText(outputBox.textContent));
    $('#downloadBtn').addEventListener('click', downloadCurrent);
    $('#clearBtn').addEventListener('click', () => {
      rawInput.value = '';
      outputBox.textContent = 'Your rewritten message will appear here.';
      detectedIntent.textContent = 'Waiting';
      detectedUrgency.textContent = 'Waiting';
      notesBox.classList.add('hidden');
      notesBox.innerHTML = '';
      rawInput.focus();
    });
    $('#clearHistoryBtn').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      renderHistory();
      showToast('Local history cleared.');
    });
    $$('.quick-examples button').forEach((button) => {
      button.addEventListener('click', () => {
        rawInput.value = button.getAttribute('data-example');
        runRewrite();
      });
    });
    rawInput.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runRewrite();
    });
  }

  attachEvents();
  renderHistory();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
})();
