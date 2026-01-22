(function () {
  var root = document.getElementById('ai-video-widget-root');
  if (!root) return;

  var state = {
    mode: 'text',
    model: 'VideoXL 1.5 (beta)',
    aspect: '16:9',
    quality: 'Standard',
    duration: 10,
    currentSlide: 0,
    isGenerating: false,
    progress: 0,
    elapsedSeconds: 0,
    rafId: null
  };

  var els = {
    tabText: root.querySelector('.ai-video-widget-tab-text'),
    tabImage: root.querySelector('.ai-video-widget-tab-image'),
    promptTextSection: root.querySelector('.ai-video-widget-prompt-text'),
    promptImageSection: root.querySelector('.ai-video-widget-prompt-image'),
    imageSection: root.querySelector('.ai-video-widget-image-section'),
    modelSelect: root.querySelector('.ai-video-widget-model-select'),
    modelLabel: root.querySelector('.ai-video-widget-model-select .ai-video-widget-select-label'),
    aspectSelect: root.querySelector('.ai-video-widget-aspect-select'),
    qualitySelect: root.querySelector('.ai-video-widget-quality-select'),
    aspectLabel: root.querySelector('.ai-video-widget-aspect-select .ai-video-widget-select-label'),
    qualityLabel: root.querySelector('.ai-video-widget-quality-select .ai-video-widget-select-label'),
    durationButtons: root.querySelectorAll('.ai-video-widget-duration-row .ai-video-widget-pill'),
    videoSlider: root.querySelector('.ai-video-widget-video-slider'),
    currentSlide: root.querySelector('.ai-video-widget-video-slide.current'),
    nextSlide: root.querySelector('.ai-video-widget-video-slide.next'),
    video: root.querySelector('.ai-video-widget-video'),
    videoNext: root.querySelector('.ai-video-widget-video-next'),
    generateBtn: root.querySelector('.ai-video-widget-generate-btn'),
    improveBtn: root.querySelector('.ai-video-widget-improve-btn'),
    toast: root.querySelector('.ai-video-widget-toast')
  };

  var baseGenerateContent =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg><span class="ai-video-widget-generate-label">Generate</span>';

  var slides = [
    { src: '/6.mp4' },
    { src: '/8.mp4' },
    { src: '/video3.mp4' }
  ];

  var autoSlideInterval = null;
  var lastRenderedSlide = -1;

  function updateVideo() {
    if (!els.video || !els.currentSlide || !els.nextSlide || !slides[state.currentSlide]) return;
    if (lastRenderedSlide === state.currentSlide) return; // Слайд не изменился, пропускаем
    
    lastRenderedSlide = state.currentSlide;
    var slide = slides[state.currentSlide];
    var currentIndex = els.video.getAttribute('data-slide-index');
    
    if (currentIndex !== String(state.currentSlide)) {
        // Если это не первая загрузка, запускаем анимацию
        if (currentIndex !== null && currentIndex !== undefined) {
          // Загружаем новое видео и запускаем с начала
          els.videoNext.src = slide.src;
          els.videoNext.currentTime = 0;
          els.videoNext.load();
          
          // Запускаем анимацию сразу
          els.currentSlide.classList.add('slide-out');
          els.nextSlide.classList.add('slide-in');
          
          // Запускаем новое видео с начала после небольшой задержки для загрузки
          els.videoNext.addEventListener('loadeddata', function onLoaded() {
            els.videoNext.removeEventListener('loadeddata', onLoaded);
            els.videoNext.play().catch(function() {});
          }, { once: true });
          
          // Если видео уже загружено, запускаем сразу
          if (els.videoNext.readyState >= 2) {
            els.videoNext.play().catch(function() {});
          }
          
          // После завершения анимации меняем слайды местами
          setTimeout(function() {
            // Меняем роли слайдов
            els.currentSlide.classList.remove('current', 'slide-out');
            els.nextSlide.classList.remove('next', 'slide-in');
            
            var tempSlide = els.currentSlide;
            var tempVideo = els.video;
            
            els.currentSlide = els.nextSlide;
            els.video = els.videoNext;
            
            els.nextSlide = tempSlide;
            els.videoNext = tempVideo;
            
            // Обновляем классы
            els.currentSlide.classList.add('current');
            els.nextSlide.classList.add('next');
            
            // Обновляем атрибуты
            els.video.setAttribute('data-src', slide.src);
            els.video.setAttribute('data-slide-index', String(state.currentSlide));
            
            // Останавливаем старое видео
            if (els.videoNext) {
              els.videoNext.pause();
              els.videoNext.currentTime = 0;
            }
          }, 800);
        } else {
          // Первая загрузка
          els.video.setAttribute('data-src', slide.src);
          els.video.setAttribute('data-slide-index', String(state.currentSlide));
          els.video.src = slide.src;
          els.video.currentTime = 0;
          els.video.load();
          els.video.play().catch(function() {});
        }
      }
  }

  function renderState() {
    if (els.modelLabel) els.modelLabel.textContent = state.model;
    if (els.aspectLabel) els.aspectLabel.textContent = state.aspect;
    if (els.qualityLabel) els.qualityLabel.textContent = state.quality;

    // Кнопка Generate визуально активна, но функционально отключена
    els.generateBtn.classList.remove('ai-video-widget-generating');
    els.generateBtn.innerHTML = baseGenerateContent;

    // Убрана логика вкладок из renderState - она обрабатывается только в toggleTabs

    function updateSelectOptions(select, value) {
      if (!select) return;
      select.querySelectorAll('.ai-video-widget-select-option').forEach(function(opt) {
        opt.classList.toggle('active', opt.getAttribute('data-value') === value);
      });
    }
    updateSelectOptions(els.modelSelect, state.model);
    updateSelectOptions(els.aspectSelect, state.aspect);
    updateSelectOptions(els.qualitySelect, state.quality);

    els.durationButtons.forEach(function (btn) {
      var val = Number(btn.getAttribute('data-duration'));
      if (val === state.duration) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function startGeneration() {
    if (state.isGenerating) return;
    state.isGenerating = true;
    state.progress = 0;
    state.elapsedSeconds = 0;

    var totalMs = 2500;
    var start = performance.now();

    function tick(now) {
      var diff = now - start;
      var ratio = Math.min(diff / totalMs, 1);
      state.progress = ratio;
      state.elapsedSeconds = state.duration * ratio;
      renderState();

      if (ratio < 1) {
        state.rafId = requestAnimationFrame(tick);
      } else {
        state.isGenerating = false;
        renderState();
      }
    }

    if (state.rafId != null) {
      cancelAnimationFrame(state.rafId);
    }
    state.rafId = requestAnimationFrame(tick);
    renderState();
  }

  function showToast() {
    if (!els.toast) return;
    els.toast.classList.add('visible');
    setTimeout(function () {
      els.toast.classList.remove('visible');
    }, 1500);
  }

  // Переключение вкладок - полностью независимо от видео, не влияет на воспроизведение
  function toggleTabs(mode) {
    state.mode = mode;
    var isText = mode === 'text';
    els.tabText.classList.toggle('active', isText);
    els.tabImage.classList.toggle('active', !isText);
    // НЕ вызываем updateVideo() или renderState() - только меняем видимость элементов
    
    // Промпт для Text to Video
    if (els.promptTextSection) {
      if (isText) {
        els.promptTextSection.style.display = '';
        els.promptTextSection.style.visibility = 'visible';
        els.promptTextSection.style.opacity = '1';
        els.promptTextSection.style.pointerEvents = 'auto';
      } else {
        els.promptTextSection.style.display = 'none';
      }
    }
    
    // Reference image и промпт для Image to Video
    if (els.imageSection) {
      if (isText) {
        els.imageSection.style.display = 'none';
      } else {
        els.imageSection.style.display = '';
        els.imageSection.style.visibility = 'visible';
        els.imageSection.style.opacity = '1';
        els.imageSection.style.pointerEvents = 'auto';
      }
    }
    if (els.promptImageSection) {
      if (isText) {
        els.promptImageSection.style.display = 'none';
      } else {
        els.promptImageSection.style.display = '';
        els.promptImageSection.style.visibility = 'visible';
        els.promptImageSection.style.opacity = '1';
        els.promptImageSection.style.pointerEvents = 'auto';
      }
    }
  }
  els.tabText.addEventListener('click', function() { toggleTabs('text'); });
  els.tabImage.addEventListener('click', function() { toggleTabs('image'); });

  function setupSelect(select, prop) {
    if (!select) return;
    var trigger = select.querySelector('.ai-video-widget-select-trigger');
    if (!trigger) return;
    
    // Открытие/закрытие по клику на trigger
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = select.classList.contains('open');
      // Закрываем все другие выпадающие списки
      document.querySelectorAll('.ai-video-widget-select.open').forEach(function(s) {
        if (s !== select) s.classList.remove('open');
      });
      select.classList.toggle('open', !isOpen);
    });
    
    // Выбор опции
    select.querySelectorAll('.ai-video-widget-select-option').forEach(function(opt) {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        var val = opt.getAttribute('data-value');
        if (val) {
          state[prop] = val;
          renderState();
          select.classList.remove('open');
        }
      });
    });
  }
  
  // Закрытие при клике вне выпадающего списка
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.ai-video-widget-select')) {
      document.querySelectorAll('.ai-video-widget-select.open').forEach(function(select) {
        select.classList.remove('open');
      });
    }
  });
  
  setupSelect(els.modelSelect, 'model');
  setupSelect(els.aspectSelect, 'aspect');
  setupSelect(els.qualitySelect, 'quality');


  els.durationButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = Number(btn.getAttribute('data-duration'));
      if (!val) return;
      state.duration = val;
      renderState();
    });
  });

  // Кнопка Generate отключена
  // els.generateBtn.addEventListener('click', function () {
  //   startGeneration();
  // });

  function startAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(function() {
      state.currentSlide = (state.currentSlide + 1) % slides.length;
      updateVideo(); // Обновляем только видео
    }, 5000);
  }

  // Кнопки слайдера удалены - слайдер работает только автоматически

  els.improveBtn.addEventListener('click', showToast);

  renderState();
  updateVideo(); // Инициализация видео при загрузке (независимо от renderState)
  startAutoSlide(); // Запускаем автопереключение при загрузке
})();
