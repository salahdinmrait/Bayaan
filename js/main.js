/* ==========================================================================
   Bayaan — main.js
   Handles: theme, header scroll, mobile nav, direction toggle,
            input tabs, recording, file upload, process flow, results
   ========================================================================== */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────────────────── */
  let currentDirection = 'ar-to-nl'; // 'ar-to-nl' | 'nl-to-ar'
  let currentTab = 'record';         // 'record' | 'upload'
  let mediaRecorder = null;
  let audioChunks = [];
  let recordedBlob = null;
  let uploadedFile = null;
  let timerInterval = null;
  let timerSeconds = 0;
  let isRecording = false;

  /* ── DOM refs ───────────────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  const header            = document.querySelector('.header');
  const menuToggle        = $('menuToggle');
  const navMenu           = $('navMenu');
  const themeDesktop      = $('themeToggleDesktop');
  const themeMobile       = $('themeToggleMobile');

  const btnArNl           = $('btnArNl');
  const btnNlAr           = $('btnNlAr');

  const tabRecord         = $('tabRecord');
  const tabUpload         = $('tabUpload');
  const panelRecord       = $('panelRecord');
  const panelUpload       = $('panelUpload');

  const recordBtn         = $('recordBtn');
  const recordBtnLabel    = $('recordBtnLabel');
  const recordIconMic     = recordBtn.querySelector('.icon-mic');
  const recordIconStop    = recordBtn.querySelector('.icon-stop');
  const clearRecordingBtn = $('clearRecordingBtn');
  const recordVisualizer  = $('recordVisualizer');
  const recordTimer       = $('recordTimer');
  const recordStatus      = $('recordStatus');
  const audioPreviewRec   = $('audioPreviewRecord');
  const audioPlayerRec    = $('audioPlayerRecord');

  const fileDropZone      = $('fileDropZone');
  const audioFileInput    = $('audioFile');
  const audioPreviewUp    = $('audioPreviewUpload');
  const audioPlayerUp     = $('audioPlayerUpload');
  const audioFileInfo     = $('audioFileInfo');

  const processBtn        = $('processBtn');
  const processBtnLabel   = $('processBtnLabel');
  const progressArea      = $('progressArea');
  const stepUpload        = $('stepUpload');
  const stepTranscribe    = $('stepTranscribe');
  const stepTranslate     = $('stepTranslate');
  const errorBanner       = $('errorBanner');
  const errorText         = $('errorText');

  const resultsArea           = $('resultsArea');
  const transcriptionCard     = $('transcriptionCard');
  const translationCard       = $('translationCard');
  const transcriptionLangLabel = $('transcriptionLangLabel');
  const translationLangLabel  = $('translationLangLabel');
  const transcriptionText     = $('transcriptionText');
  const translationText       = $('translationText');
  const copyTranscription     = $('copyTranscription');
  const copyTranslation       = $('copyTranslation');
  const newMemoBtn            = $('newMemoBtn');

  /* ── Theme ──────────────────────────────────────────────────────────────── */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  themeDesktop && themeDesktop.addEventListener('click', toggleTheme);
  themeMobile  && themeMobile.addEventListener('click', toggleTheme);

  /* ── Header scroll ──────────────────────────────────────────────────────── */
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  /* ── Mobile nav ─────────────────────────────────────────────────────────── */
  menuToggle && menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navMenu.classList.remove('active'));
  });

  /* ── Direction toggle ───────────────────────────────────────────────────── */
  function setDirection(dir) {
    currentDirection = dir;
    btnArNl.classList.toggle('active', dir === 'ar-to-nl');
    btnNlAr.classList.toggle('active', dir === 'nl-to-ar');

    if (dir === 'ar-to-nl') {
      transcriptionLangLabel.textContent = 'Transcription (Arabic)';
      translationLangLabel.textContent   = 'Translation (Dutch)';
    } else {
      transcriptionLangLabel.textContent = 'Transcription (Dutch)';
      translationLangLabel.textContent   = 'Translation (Arabic)';
    }
  }

  btnArNl.addEventListener('click', () => setDirection('ar-to-nl'));
  btnNlAr.addEventListener('click', () => setDirection('nl-to-ar'));

  /* ── Input tabs ─────────────────────────────────────────────────────────── */
  function switchTab(tab) {
    currentTab = tab;
    tabRecord.classList.toggle('active', tab === 'record');
    tabUpload.classList.toggle('active', tab === 'upload');
    panelRecord.style.display = tab === 'record' ? '' : 'none';
    panelUpload.style.display = tab === 'upload' ? '' : 'none';
    updateProcessButton();
  }

  tabRecord.addEventListener('click', () => switchTab('record'));
  tabUpload.addEventListener('click', () => switchTab('upload'));

  /* ── Timer ──────────────────────────────────────────────────────────────── */
  function startTimer() {
    timerSeconds = 0;
    recordTimer.textContent = '0:00';
    timerInterval = setInterval(() => {
      timerSeconds++;
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      recordTimer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  /* ── Recording ──────────────────────────────────────────────────────────── */
  recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      stopRecording();
    }
  });

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : {};

      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        recordedBlob = new Blob(audioChunks, { type: mimeType });
        const url = URL.createObjectURL(recordedBlob);
        audioPlayerRec.src = url;
        audioPreviewRec.style.display = '';
        stream.getTracks().forEach(t => t.stop());
        updateProcessButton();
      };

      mediaRecorder.start(200);
      isRecording = true;

      recordVisualizer.classList.add('recording');
      recordVisualizer.classList.remove('has-audio');
      recordIconMic.style.display = 'none';
      recordIconStop.style.display = '';
      recordBtnLabel.textContent = 'Stop recording';
      recordStatus.textContent = 'Recording…';
      clearRecordingBtn.style.display = 'none';
      audioPreviewRec.style.display = 'none';
      startTimer();

    } catch (err) {
      showError('Could not access microphone. Please allow microphone access and try again.');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    stopTimer();

    recordVisualizer.classList.remove('recording');
    recordVisualizer.classList.add('has-audio');
    recordIconMic.style.display = '';
    recordIconStop.style.display = 'none';
    recordBtnLabel.textContent = 'Record again';
    recordStatus.textContent = 'Recording complete — preview below';
    clearRecordingBtn.style.display = '';
  }

  clearRecordingBtn.addEventListener('click', () => {
    recordedBlob = null;
    audioPreviewRec.style.display = 'none';
    audioPlayerRec.src = '';
    recordVisualizer.classList.remove('has-audio');
    recordBtnLabel.textContent = 'Start recording';
    recordStatus.textContent = 'Press the button to start recording';
    recordTimer.textContent = '0:00';
    clearRecordingBtn.style.display = 'none';
    updateProcessButton();
  });

  /* ── File upload ────────────────────────────────────────────────────────── */
  audioFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleUploadedFile(file);
  });

  fileDropZone.addEventListener('dragover', e => {
    e.preventDefault();
    fileDropZone.classList.add('drag-over');
  });
  fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('drag-over'));
  fileDropZone.addEventListener('drop', e => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleUploadedFile(file);
  });

  function handleUploadedFile(file) {
    const maxMB = 25;
    if (file.size > maxMB * 1024 * 1024) {
      showError(`File is too large. Maximum size is ${maxMB} MB.`);
      return;
    }
    uploadedFile = file;
    const url = URL.createObjectURL(file);
    audioPlayerUp.src = url;
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    audioFileInfo.textContent = `${file.name} · ${mb} MB`;
    audioPreviewUp.style.display = '';
    updateProcessButton();
  }

  /* ── Process button state ───────────────────────────────────────────────── */
  function updateProcessButton() {
    const hasAudio = currentTab === 'record' ? !!recordedBlob : !!uploadedFile;
    processBtn.disabled = !hasAudio;
  }

  /* ── Progress helpers ───────────────────────────────────────────────────── */
  function setStep(stepEl, state) {
    stepEl.classList.remove('active', 'done');
    if (state) stepEl.classList.add(state);
  }

  function resetProgress() {
    setStep(stepUpload, null);
    setStep(stepTranscribe, null);
    setStep(stepTranslate, null);
    progressArea.style.display = 'none';
  }

  /* ── Error ──────────────────────────────────────────────────────────────── */
  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.style.display = '';
  }

  function clearError() {
    errorBanner.style.display = 'none';
    errorText.textContent = '';
  }

  /* ── Process flow ───────────────────────────────────────────────────────── */
  processBtn.addEventListener('click', async () => {
    clearError();
    resultsArea.style.display = 'none';
    resetProgress();

    const audioBlob = currentTab === 'record' ? recordedBlob : uploadedFile;
    if (!audioBlob) return;

    processBtn.disabled = true;
    processBtnLabel.textContent = 'Processing…';
    progressArea.style.display = '';

    try {
      /* Step 1 — Upload & transcribe */
      setStep(stepUpload, 'active');
      setStep(stepTranscribe, 'active');

      const formData = new FormData();
      const ext = audioBlob.type.includes('webm') ? 'webm'
                : audioBlob.type.includes('mp4')  ? 'mp4'
                : audioBlob.type.includes('ogg')  ? 'ogg'
                : 'mp3';
      const filename = uploadedFile ? uploadedFile.name : `recording.${ext}`;
      formData.append('audio', audioBlob, filename);
      formData.append('direction', currentDirection);

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({}));
        throw new Error(err.error || `Transcription failed (${transcribeRes.status})`);
      }

      const { text: transcribedText } = await transcribeRes.json();
      setStep(stepUpload, 'done');
      setStep(stepTranscribe, 'done');

      /* Step 2 — Translate */
      setStep(stepTranslate, 'active');

      const translateRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcribedText, direction: currentDirection }),
      });

      if (!translateRes.ok) {
        const err = await translateRes.json().catch(() => ({}));
        throw new Error(err.error || `Translation failed (${translateRes.status})`);
      }

      const { text: translatedText } = await translateRes.json();
      setStep(stepTranslate, 'done');

      /* Show results */
      showResults(transcribedText, translatedText);

    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      processBtn.disabled = false;
      processBtnLabel.innerHTML = 'Transcribe &amp; Translate';
      updateProcessButton();
    }
  });

  /* ── Results ────────────────────────────────────────────────────────────── */
  function showResults(transcription, translation) {
    transcriptionText.textContent = transcription;
    translationText.textContent   = translation;

    /* Set text direction based on language */
    if (currentDirection === 'ar-to-nl') {
      transcriptionText.setAttribute('dir', 'rtl');
      translationText.setAttribute('dir', 'ltr');
    } else {
      transcriptionText.setAttribute('dir', 'ltr');
      translationText.setAttribute('dir', 'rtl');
    }

    resultsArea.style.display = '';
    resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Copy buttons ───────────────────────────────────────────────────────── */
  async function copyText(btn, text) {
    try {
      await navigator.clipboard.writeText(text);
      const span = btn.querySelector('span');
      const orig = span.textContent;
      span.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        span.textContent = orig;
        btn.classList.remove('copied');
      }, 2000);
    } catch {
      /* fallback */
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  copyTranscription.addEventListener('click', () => copyText(copyTranscription, transcriptionText.textContent));
  copyTranslation.addEventListener('click',   () => copyText(copyTranslation,   translationText.textContent));

  /* ── New memo ───────────────────────────────────────────────────────────── */
  newMemoBtn.addEventListener('click', () => {
    resultsArea.style.display = 'none';
    resetProgress();
    clearError();
    transcriptionText.textContent = '';
    translationText.textContent   = '';
    document.querySelector('#tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ── Smooth scroll for anchor links ─────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Scroll-in animations ───────────────────────────────────────────────── */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.process-step, .result-card').forEach(el => observer.observe(el));

  /* ── Init ───────────────────────────────────────────────────────────────── */
  setDirection('ar-to-nl');
  updateProcessButton();

})();
