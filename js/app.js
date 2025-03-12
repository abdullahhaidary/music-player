$(document).ready(function() {
    // State management
    let currentLanguage = 'en';
    let isDarkMode = false;
    let isPlaying = false;
    let currentTrack = null;
    let translations = {};
    let playlist = [];
    let currentTrackIndex = -1;

    // Audio player setup
    const audioPlayer = document.getElementById('audioPlayer');
    
    // Handle file import
    $('#musicFileInput').on('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            playlist = Array.from(files).map(file => ({
                file: file,
                name: file.name.replace(/\.[^/.]+$/, ""),
                artist: "Local File"
            }));
            
            // Create playlist items
            updatePlaylist();
            
            // Play first track
            if (currentTrackIndex === -1) {
                playTrack(0);
            }
        }
    });

    function updatePlaylist() {
        const playlistContainer = $('.space-y-4');
        playlistContainer.empty();
        
        playlist.forEach((track, index) => {
            const item = $(`
                <div class="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-dark-300 rounded-lg transition-colors cursor-pointer ${index === currentTrackIndex ? 'bg-gray-50 dark:bg-dark-300' : ''}">
                    <div class="w-12 h-12 rounded bg-gray-200 dark:bg-dark-300 mr-4 flex items-center justify-center">
                        <i class="fas fa-music text-gray-400"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-gray-800 dark:text-white font-medium">${track.name}</h4>
                        <p class="text-gray-600 dark:text-gray-400 text-sm">${track.artist}</p>
                    </div>
                    <span class="text-gray-600 dark:text-gray-400">-:--</span>
                </div>
            `);
            
            item.click(() => playTrack(index));
            playlistContainer.append(item);
        });
    }

    function playTrack(index) {
        if (index >= 0 && index < playlist.length) {
            currentTrackIndex = index;
            const track = playlist[index];
            
            // Update UI
            $('#currentSongTitle').text(track.name);
            $('#currentArtist').text(track.artist);
            
            // Create object URL for the audio file
            const audioUrl = URL.createObjectURL(track.file);
            audioPlayer.src = audioUrl;
            audioPlayer.play();
            isPlaying = true;
            $('.fa-play').removeClass('fa-play').addClass('fa-pause');
            
            // Update playlist highlighting
            updatePlaylist();
        }
    }

    // Audio player event listeners
    audioPlayer.addEventListener('timeupdate', function() {
        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        const progress = (currentTime / duration) * 100;
        
        // Update progress bar
        $('.progress-current').css('width', `${progress}%`);
        
        // Update time displays
        $('#currentTime').text(formatTime(currentTime));
        $('#duration').text(formatTime(duration));
    });

    audioPlayer.addEventListener('ended', function() {
        if (currentTrackIndex < playlist.length - 1) {
            playTrack(currentTrackIndex + 1);
        } else {
            isPlaying = false;
            $('.fa-pause').removeClass('fa-pause').addClass('fa-play');
        }
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update play/pause button functionality
    $('.fa-play').parent().click(function() {
        if (playlist.length === 0) return;
        
        isPlaying = !isPlaying;
        $(this).find('i').toggleClass('fa-play fa-pause');
        
        if (isPlaying) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    });

    // Progress bar interaction
    $('.progress').click(function(e) {
        if (playlist.length === 0) return;
        
        const progressBar = $(this);
        const clickPosition = (e.pageX - progressBar.offset().left) / progressBar.width();
        const newTime = clickPosition * audioPlayer.duration;
        
        audioPlayer.currentTime = newTime;
    });

    // Previous/Next buttons
    $('.fa-step-backward').parent().click(function() {
        if (currentTrackIndex > 0) {
            playTrack(currentTrackIndex - 1);
        }
    });

    $('.fa-step-forward').parent().click(function() {
        if (currentTrackIndex < playlist.length - 1) {
            playTrack(currentTrackIndex + 1);
        }
    });

    // Shuffle button
    $('.fa-random').parent().click(function() {
        if (playlist.length <= 1) return;
        
        const currentTrack = playlist[currentTrackIndex];
        playlist = shuffle(playlist.filter((_, i) => i !== currentTrackIndex));
        playlist.unshift(currentTrack);
        currentTrackIndex = 0;
        updatePlaylist();
    });

    function shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex !== 0) {
            const randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    // Load translations
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`assets/lang/${lang}.json`);
            translations = await response.json();
            updatePageTranslations();
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    // Update page translations
    function updatePageTranslations() {
        $('[data-lang]').each(function() {
            const key = $(this).attr('data-lang');
            const translation = getTranslationByKey(key);
            if (translation) {
                if ($(this).is('input')) {
                    $(this).attr('placeholder', translation);
                } else {
                    $(this).text(translation);
                }
            }
        });
    }

    // Get nested translation by key (e.g., "app.title")
    function getTranslationByKey(key) {
        return key.split('.').reduce((obj, i) => obj?.[i], translations);
    }

    // Dark mode toggle
    $('#darkModeToggle').click(function() {
        isDarkMode = !isDarkMode;
        $('body').toggleClass('dark');
        $(this).find('i').toggleClass('fa-moon fa-sun');
        localStorage.setItem('darkMode', isDarkMode);
    });

    // Language switcher
    $('#languageSelect').change(function() {
        currentLanguage = $(this).val();
        loadTranslations(currentLanguage);
        localStorage.setItem('language', currentLanguage);
        
        // Handle RTL for Persian and Pashto
        if (currentLanguage === 'fa' || currentLanguage === 'ps') {
            $('html').attr('dir', 'rtl');
            $('body').addClass('rtl');
        } else {
            $('html').attr('dir', 'ltr');
            $('body').removeClass('rtl');
        }
    });

    // Volume control
    let isDraggingVolume = false;
    
    $('.volume-slider').on('mousedown', function(e) {
        isDraggingVolume = true;
        updateVolume(e);
    });

    $(document).on('mousemove', function(e) {
        if (isDraggingVolume) {
            updateVolume(e);
        }
    });

    $(document).on('mouseup', function() {
        isDraggingVolume = false;
    });

    function updateVolume(e) {
        const slider = $('.volume-slider');
        const clickPosition = (e.pageX - slider.offset().left) / slider.width();
        const volume = Math.max(0, Math.min(1, clickPosition));
        
        // Update volume slider visually
        slider.find('.volume-level').css('width', `${volume * 100}%`);
        
        // Add your volume control logic here
        console.log(`Volume set to ${volume * 100}%`);
    }

    // Search functionality
    let searchTimeout;
    $('input[data-lang="app.search"]').on('input', function() {
        clearTimeout(searchTimeout);
        const searchTerm = $(this).val();
        
        searchTimeout = setTimeout(() => {
            // Add your search logic here
            console.log('Searching for:', searchTerm);
        }, 500);
    });

    // Initialize
    function init() {
        // Load saved preferences
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        const savedLanguage = localStorage.getItem('language') || 'en';

        // Apply dark mode if saved
        if (savedDarkMode) {
            isDarkMode = true;
            $('body').addClass('dark');
            $('#darkModeToggle i').removeClass('fa-moon').addClass('fa-sun');
        }

        // Apply saved language
        if (savedLanguage) {
            currentLanguage = savedLanguage;
            $('#languageSelect').val(savedLanguage);
            loadTranslations(savedLanguage);
            
            if (savedLanguage === 'ar') {
                $('html').attr('dir', 'rtl');
                $('body').addClass('rtl');
            }
        } else {
            loadTranslations('en');
        }
    }

    init();
}); 
// add a console.log which will print the test
