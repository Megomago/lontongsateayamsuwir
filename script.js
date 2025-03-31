/* --- START OF FILE script.js --- */

// --- Firebase & Supabase Setup ---
let db, commentsRef, typingStatusRef, supabaseClient;
try {
    // Ensure Firebase is initialized (from index.html) before accessing its methods
    if (typeof firebase !== 'undefined' && firebase.app) {
        db = firebase.database(); // Use compat database
        commentsRef = db.ref("comments");
        typingStatusRef = db.ref("typingStatus");
    } else {
        throw new Error("Firebase not initialized correctly.");
    }

    // Ensure Supabase is initialized (from index.html)
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(
            'https://ljyxligmxrxeschnizsr.supabase.co', // Replace with your Supabase URL
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeXhsaWdteHJ4ZXNjaG5penNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwODI4MDAsImV4cCI6MjA1NjY1ODgwMH0.2iIoGcxHR_LmVUsRhuS1zl_rXJhhRfbh7LZy4GDb92o' // Replace with your Supabase Anon Key
        );
    } else {
        throw new Error("Supabase not initialized correctly.");
    }
} catch (error) {
    console.error("Initialization Error:", error);
    // Optionally display a user-friendly error message on the page
    document.body.innerHTML = `<p style="color: red; padding: 20px;">Error initializing services: ${error.message}. Please check configuration and reload.</p>`;
    // Stop script execution if critical services fail
    throw error; // Re-throw to halt execution
}


// --- Global Variables ---
const defaultText = "Pilih Truth atau Dare!"; // Default text
let currentEditingCommentKey = null;
let selectedMedia = null; // Stores { file: File, type: 'image' | 'video' }
let typingTimeout;
let lastScrollHeight = 0; // For scroll management

// --- DOM Element References ---
let usernameInput, commentInput, submitButton, mediaInput, mediaPreview, cancelMediaButton, commentsContainer, displayTextElement, popupElement, popupTextElement;

// Function to safely get DOM elements
function getElements() {
    usernameInput = document.getElementById('username');
    commentInput = document.getElementById('comment-text');
    submitButton = document.getElementById('submit-comment');
    mediaInput = document.getElementById('media-upload');
    mediaPreview = document.getElementById('media-preview');
    // IMPORTANT: Get cancel button from INSIDE mediaPreview div in new HTML
    cancelMediaButton = document.getElementById('cancel-media');
    commentsContainer = document.getElementById('comments-container');
    displayTextElement = document.getElementById('displayText');
    popupElement = document.getElementById('popup');
    popupTextElement = document.getElementById('popupText');

    // Basic check if essential elements exist
    if (!usernameInput || !commentInput || !submitButton || !mediaInput || !mediaPreview || !cancelMediaButton || !commentsContainer) {
        console.error("One or more essential elements not found. Check HTML IDs.");
        return false; // Indicate failure
    }
    return true; // Indicate success
}


// --- TRUTH OR DARE DATA (Keep as is) ---
const truths = ["Apa rahasia yang belum pernah kamu ceritakan ke siapa pun?", /* ... other truths ... */];
const dares = ["Lakukan tarian aneh selama 30 detik!", /* ... other dares ... */ ];
// --- (Truncated for brevity) -> Include your full truths/dares arrays here ---
truths.push(
    "Apa rahasia yang belum pernah kamu ceritakan ke siapa pun?",
    "Siapa orang yang diam-diam kamu sukai?",
    "Pernahkah kamu berbohong ke orang tua?",
    "Apa ketakutan terbesarmu?",
    "Apa mimpi terliar yang pernah kamu miliki?",
    "Pernahkah kamu mencuri sesuatu kecil dari toko?",
    "Apa kenangan memalukan yang paling kamu ingat?",
    "Siapa teman yang paling kamu percaya?",
    "Apa hal teraneh yang pernah kamu lakukan?",
    "Apa yang paling kamu sesali?",
    "Pernahkah kamu merasa iri kepada temanmu?",
    "Apa yang membuatmu merasa paling tidak nyaman?",
    "Pernahkah kamu merasa bahwa kamu tidak cukup baik?",
    "Apa rahasia tentang dirimu yang ingin kamu ubah?",
    "Siapa yang menjadi inspirasimu dalam hidup?",
    "Pernahkah kamu menangis di depan umum?",
    "Apa impian terbesarmu yang ingin kamu capai?",
    "Apa sifat burukmu yang paling ingin kamu hilangkan?",
    "Apa yang paling membuatmu marah?",
    "Pernahkah kamu memendam perasaan yang menyakitkan?",
    "Apa yang membuatmu merasa bahagia tanpa alasan?",
    "Apa kenangan indah yang tidak pernah kamu lupakan?",
    "Apa yang membuatmu merasa bangga terhadap dirimu sendiri?",
    "Pernahkah kamu merasa gagal dalam suatu hal?",
    "Apa alasan terbesar kamu untuk tersenyum setiap hari?",
    "Apa rahasia kecil yang membuatmu merasa istimewa?",
    "Apa hal paling spontan yang pernah kamu lakukan?",
    "Pernahkah kamu mengkhianati kepercayaan seseorang?",
    "Apa yang paling kamu takuti di masa depan?",
    "Apa mimpi terliar yang pernah kamu bayangkan?",
    "Pernahkah kamu merasa tidak dipahami oleh orang tua?",
    "Apa yang ingin kamu ubah tentang dirimu?",
    "Apa pengalaman yang paling membuatmu berubah?",
    "Siapa yang paling mempengaruhi hidupmu?",
    "Apa kejadian yang membuatmu merasa sangat sedih?",
    "Apa pelajaran hidup terbesar yang pernah kamu pelajari?",
    "Apa hal yang paling kamu syukuri dalam hidup?",
    "Pernahkah kamu merasa kesepian di tengah keramaian?",
    "Apa yang ingin kamu capai dalam lima tahun ke depan?",
    "Pernahkah kamu merasa bersalah karena melakukan sesuatu?",
    "Apa yang membuatmu merasa paling berani?",
    "Apa momen paling berkesan selama sekolah?",
    "Siapa yang paling pernah membuatmu tersenyum?",
    "Apa kenangan masa kecil yang paling kamu ingat?",
    "Apa yang paling kamu sukai dari dirimu sendiri?",
    "Apa hal yang paling ingin kamu pelajari di masa depan?",
    "Pernahkah kamu menyesal tidak melakukan sesuatu?",
    "Apa yang membuatmu merasa paling terinspirasi?",
    "Apa kesalahan terbesar yang pernah kamu buat?",
    "Apa yang paling kamu takutkan saat sendirian?",
    "Apa mimpi yang belum pernah kamu ungkapkan kepada siapa pun?",
    "Pernahkah kamu merasa cemburu pada keberhasilan temanmu?",
    "Apa yang paling kamu rindukan dari masa lalu?",
    "Pernahkah kamu merasa bahwa kamu tidak cukup dihargai?",
    "Apa harapan terbesarmu untuk masa depan?",
    "Apa yang membuatmu merasa paling nyaman?",
    "Pernahkah kamu merasa takut untuk mencoba hal baru?",
    "Apa yang paling kamu takuti dari perubahan?",
    "Apa yang membuatmu merasa paling termotivasi?",
    "Pernahkah kamu berbohong untuk menyelamatkan diri?",
    "Apa yang paling kamu khawatirkan untuk dirimu sendiri?",
    "Apa kenangan terindah yang pernah kamu alami?",
    "Pernahkah kamu merasa gagal dalam hubungan pertemanan?",
    "Apa yang membuatmu merasa paling diterima oleh orang lain?",
    "Apa yang paling membuatmu bangga atas pencapaianmu?",
    "Pernahkah kamu merasa tersisih di antara teman-teman?",
    "Apa yang ingin kamu ubah dari sistem sekolah?",
    "Apa pendapatmu tentang tekanan teman sebaya?",
    "Pernahkah kamu merasa kurang percaya diri?",
    "Apa yang membuatmu merasa paling hidup?",
    "Apa rahasia kecil yang selama ini kamu simpan?",
    "Apa yang paling kamu hargai dari keluarga?",
    "Pernahkah kamu merasakan perbedaan antara harapan dan kenyataan?",
    "Apa yang paling membuatmu takut untuk gagal?",
    "Apa yang akan kamu lakukan jika punya kesempatan kedua?",
    "Pernahkah kamu merasa bahwa kamu terlalu sering membandingkan dirimu dengan orang lain?",
    "Apa yang membuatmu merasa paling bersyukur?",
    "Apa yang membuatmu merasa paling nyaman ketika sedih?",
    "Apa momen yang paling membuatmu tersenyum sepanjang hari?",
    "Pernahkah kamu merasa bahwa kamu tidak mampu mengatasi masalah?",
    "Apa yang paling kamu sukai dari masa remajamu?",
    "Apa yang membuatmu merasa paling unik?",
    "Pernahkah kamu merasa sulit untuk meminta bantuan?",
    "Apa yang paling membuatmu merasa tertekan di sekolah?",
    "Apa pendapatmu tentang persahabatan sejati?",
    "Apa yang membuatmu merasa paling dihargai?",
    "Apa yang membuatmu merasa paling bersemangat setiap pagi?",
    "Pernahkah kamu merasa bahwa kamu tidak cukup pandai?",
    "Apa yang paling kamu inginkan dari hubungan pertemanan?",
    "Apa yang membuatmu merasa paling aman?",
    "Pernahkah kamu merasa bahwa kamu terlalu mengharapkan terlalu banyak dari dirimu sendiri?",
    "Apa yang membuatmu merasa paling diinginkan oleh orang lain?",
    "Apa yang paling kamu takuti dalam hubungan pertemanan?",
    "Pernahkah kamu merasa bahwa kamu harus menyembunyikan perasaanmu?",
    "Apa yang membuatmu merasa paling bebas?",
    "Apa yang membuatmu merasa paling puas dengan dirimu?",
    "Pernahkah kamu merasa bahwa kamu tidak pernah cukup berani untuk menyuarakan pendapat?",
    "Apa yang membuatmu merasa paling berharga?",
    "Apa yang paling membuatmu merasa dimengerti oleh orang lain?",
    "Apa pesan yang ingin kamu sampaikan kepada dirimu di masa depan?"
);
dares.push(
    "Lakukan tarian aneh selama 30 detik!",
    "Kirim chat 'Aku suka kamu' ke orang random!",
    "Bilang 'Aku lapar, traktir dong' ke orang sebelah!",
    "Selfie dengan ekspresi teraneh dan kirim ke grup!",
    "Nyanyikan lagu favoritmu dengan suara paling kencang!",
    "Tiru gaya bicara tokoh kartun favorit selama 1 menit!",
    "Jadiin semua orang di grup chat panggilan lucu selama 2 menit!",
    "Coba lari keliling rumah selama 1 menit dengan gaya dramatis!",
    "Pura-pura jadi pawang angin selama 1 menit!",
    "Buat video pendek dengan aksi dramatis dan upload ke medsos!",
    "Berikan pujian aneh ke 3 orang berbeda!",
    "Bicara dengan aksen asing selama 5 menit tanpa henti!",
    "Goyang kayak robot selama 30 detik di depan kamera!",
    "Buat cerita lucu dalam 2 menit dan rekam suaramu!",
    "Bilang ke orang terdekat bahwa kamu terobsesi sama mereka dengan cara yang gokil!",
    "Baca puisi ciptaanmu sendiri dengan nada dramatis!",
    "Nyanyikan lagu anak-anak dengan gaya rock!",
    "Lakukan 10 push-up sambil teriak 'Aku hebat!'",
    "Buat video dance ala TikTok selama 15 detik!",
    "Angkat tangan kiri dan kanan secara bersamaan sambil berteriak 'Aku luar biasa!'",
    "Pura-pura jadi guru dan ajarin pelajaran favoritmu selama 2 menit!",
    "Buat gerakan yoga aneh yang kamu sebut 'pose kekuatan'!",
    "Tirukan suara hewan favoritmu selama 1 menit!",
    "Ucapkan selamat pagi ke 5 orang dengan cara paling unik!",
    "Coba bikin lelucon yang bikin semua orang tertawa!",
    "Bikin daftar 5 hal absurd yang pernah kamu pikirkan hari ini!",
    "Bicara tanpa kata 'aku' selama 3 menit!",
    "Pura-pura jadi detektif dan selidiki 'kasus' yang kamu buat sendiri!",
    "Tirukan karakter film favoritmu selama 1 menit!",
    "Buat video mini tentang 'hari dalam kehidupan alien'!",
    "Buat tantangan kecil dengan bicara logat negara lain selama 1 menit!",
    "Makan camilan sambil berdiri dengan satu kaki selama 30 detik!",
    "Teriak 'Aku cinta dunia!' dengan suara paling tinggi yang kamu bisa!",
    "Buat video di mana kamu jatuh cinta sama makanan favoritmu!",
    "Tirukan selebriti favoritmu selama 1 menit!",
    "Ajak teman main 'saling menyebut nama lucu' selama 2 menit!",
    "Buat reaksi dramatis seolah mendengar kabar mengejutkan!",
    "Tirukan suara karakter kartun yang sedang kamu tonton!",
    "Bikin lelucon dadakan soal kehidupan sekolah!",
    "Ubah lirik lagu favoritmu jadi versi kocak dan nyanyikan!",
    "Ajak keluarga ikut berdansa selama 1 menit!",
    "Berjalan seperti model di jalan raya selama 30 detik!",
    "Buat video kreatif dari barang-barang di sekitarmu!",
    "Pura-pura jadi penyanyi opera selama 1 menit!",
    "Tirukan lagi gaya bicara karakter film kartun favoritmu!",
    "Ucapkan 'halo dunia' dengan cara paling dramatis!",
    "Buat video tiruan iklan favoritmu dengan gaya kamu sendiri!",
    "Gunakan kata-kata asing selama 1 menit tanpa henti!",
    "Buat video reaksi seolah kamu terkejut lihat sesuatu yang luar biasa!",
    "Ceritain lelucon tentang situasi lucu yang kamu alami hari ini!",
    "Ajak teman main tebak-tebakan dengan gaya unik!",
    "Tirukan suara robot dan ngobrol selama 1 menit!",
    "Coba logat daerah lain selama 1 menit!",
    "Berikan pujian ke orang di sekitarmu dengan cara super unik!",
    "Buat video pendek seolah jadi pembawa acara TV!",
    "Bicara ala superhero selama 1 menit!",
    "Parodikan iklan favoritmu dalam 30 detik!",
    "Tari spontan di tempat umum selama 30 detik!",
    "Buat video yang menunjukkan ekspresi wajah paling dramatis!",
    "Lakukan gerakan stretching dengan gaya yang kocak!",
    "Tirukan suara karakter game favoritmu selama 1 menit!",
    "Buat video meniru cara makan orang terkenal!",
    "Nyanyikan lagu dengan logat terbalik selama 1 menit!",
    "Buat video sambil melompat-lompat dan tertawa lepas!",
    "Berdansa tanpa musik selama 1 menit!",
    "Bermain peran sebagai karakter kartun selama 1 menit!",
    "Bicara ala pembawa berita selama 1 menit!",
    "Buat video reaksi seolah baru lihat hal menakjubkan!",
    "Tirukan suara hewan paling lucu menurutmu!",
    "Tirukan lagi suara penyanyi favoritmu selama 1 menit!",
    "Pura-pura jadi pahlawan super selama 1 menit!",
    "Buat video pendek tarian kocak bareng teman!",
    "Baca lirik lagu dengan suara paling aneh yang kamu bisa!",
    "Tampilkan ekspresi wajah super dramatis selama 30 detik!",
    "Tirukan cara bicara tokoh terkenal dengan gaya kamu sendiri!",
    "Bicara puitis selama 1 menit tanpa berhenti!",
    "Tirukan iklan televisi favoritmu dalam 30 detik!",
    "Jalan dengan gaya super unik di sekitar rumah selama 30 detik!",
    "Nyanyikan lagu anak-anak dengan suara paling kencang yang ada!",
    "Tampil dengan tarian ala hip-hop selama 30 detik!",
    "Tunjukkan cara kamu merayakan sesuatu dengan cara unik!",
    "Tirukan penyanyi opera selama 1 menit!",
    "Berdansa dengan gaya bebas selama 1 menit!",
    "Buat video reaksi seolah mengalami kejadian lucu!",
    "Bicara dengan logat berbeda-beda selama 2 menit!",
    "Buat video tema 'perjalanan waktu' dengan aksi spontan!",
    "Pura-pura jadi selebriti selama 1 menit dan berpose!",
    "Tirukan suara pembawa acara olahraga selama 1 menit!",
    "Tunjukkan aksi tari kreatifmu dalam 30 detik!",
    "Nyanyikan lagu dengan gaya rock selama 1 menit!",
    "Bikin video kocak bareng teman-teman selama 1 menit!",
    "Tirukan suara karakter film animasi favoritmu selama 1 menit!",
    "Tunjukkan gerakan tarian unikmu dalam video singkat!",
    "Ekspresikan wajah paling ekstrem selama 30 detik dalam video!",
    "Bacakan puisi dengan nada berbeda-beda selama 1 menit!",
    "Tunjukkan kemampuan akting spontanmu dalam video singkat!",
    "Tirukan suara karakter dari game favoritmu selama 1 menit!",
    "Pura-pura jadi pembawa acara radio selama 1 menit!",
    "Buat video dengan benda sekitarmu yang jadi alat musik!",
    "Tirukan gaya selebriti dengan cara yang paling kocak!"
);

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, m => map[m]);
}



function autoResizeTextarea() {
    if (!commentInput) return;
    commentInput.style.height = 'auto'; // Reset height
    const maxHeight = parseInt(window.getComputedStyle(commentInput).maxHeight, 10) || 120;
    const requiredHeight = commentInput.scrollHeight;
    const newHeight = Math.min(requiredHeight, maxHeight);
    commentInput.style.height = newHeight + 'px';
    // Show scrollbar only if content exceeds max height
    commentInput.style.overflowY = (requiredHeight > maxHeight) ? 'auto' : 'hidden';
}

function scrollToBottom(force = false) {
    if (!commentsContainer) return;
    const scrollThreshold = 150; // How close to bottom counts as "at bottom"
    const currentScroll = commentsContainer.scrollTop;
    const containerHeight = commentsContainer.clientHeight;
    const totalHeight = commentsContainer.scrollHeight;

    // Check if user is scrolled near the bottom OR if forced
    const isNearBottom = totalHeight - containerHeight <= currentScroll + scrollThreshold;

    if (force || isNearBottom) {
        // Use smooth scrolling for a better experience
        commentsContainer.scrollTo({ top: totalHeight, behavior: 'smooth' });
    }
    lastScrollHeight = totalHeight; // Update last known height
}

// --- Truth or Dare Logic ---
function showText(text) {
    if (displayTextElement) displayTextElement.textContent = text;
}

function clearText() {
    if (displayTextElement) displayTextElement.textContent = defaultText;
}

function Gettrut() {
    if (!usernameInput || !popupTextElement || !popupElement) return;
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Isi namamu dulu, ya!');
        usernameInput.focus();
        return;
    }
    const truth = truths[Math.floor(Math.random() * truths.length)];
    popupTextElement.textContent = `Truth untuk ${username}: ${truth}`;
    popupElement.style.display = "flex";
    addSystemComment(username, 'Truth', truth); // Send to chat
}

function Getdare() {
    if (!usernameInput || !popupTextElement || !popupElement) return;
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Isi namamu dulu, ya!');
        usernameInput.focus();
        return;
    }
    const dare = dares[Math.floor(Math.random() * dares.length)];
    popupTextElement.textContent = `Dare untuk ${username}: ${dare}`;
    popupElement.style.display = "flex";
    addSystemComment(username, 'Dare', dare); // Send to chat
}

function closePopup() {
    if (popupElement) popupElement.style.display = "none";
}

function addSystemComment(username, type, text) {
    if (!commentsRef) {
        console.error("Firebase commentsRef not available for system comment.");
        return; // Can't add comment if reference is missing
    }
    const comment = {
        username: 'Sistem', // Special username for system messages
        text: `${username} memilih ${type}: "${text}"`,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        isEdited: false,
        mediaUrl: null,
        mediaType: null,
        isSystemMessage: true // Add a flag for easy identification
    };
    commentsRef.push(comment).catch(error => {
        console.error("Error adding system comment:", error);
    });
}

// --- Media Handling ---
function clearMediaPreview() {
    if (mediaInput) mediaInput.value = ''; // Clear file input
    if (mediaPreview) mediaPreview.innerHTML = ''; // Clear visual preview
    // Cancel button is inside mediaPreview, clearing innerHTML removes it too
    selectedMedia = null; // Reset selection state
}

function handleFileSelect(event) {
    // We only need mediaPreview here for displaying the preview itself
    if (!mediaPreview || !submitButton) return;

    const file = event.target.files[0];
    if (!file) {
        clearMediaPreview();
        return;
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    let fileType = null;

    if (allowedImageTypes.includes(file.type)) fileType = 'image';
    else if (allowedVideoTypes.includes(file.type)) fileType = 'video';
    else {
        alert('Format file tidak didukung. Hanya gambar (jpg, png, gif, webp) dan video (mp4, webm, ogg) yang diizinkan.');
        clearMediaPreview();
        return;
    }

    const maxSizeMB = 15;
    if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB.`);
        clearMediaPreview();
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        mediaPreview.innerHTML = ''; // Clear previous

        // Create a container for the preview and cancel button
        const previewContainer = document.createElement('div');
        previewContainer.style.position = 'relative'; // For absolute positioning of cancel button
        previewContainer.style.display = 'inline-block'; // To wrap content

        let mediaElement;
        // Styles now defined in CSS, but we can keep inline for simplicity here or add a class
        const commonStyle = `max-width: 100px; max-height: 100px; border-radius: 8px; display: block; box-shadow: 0 1px 3px rgba(0,0,0,0.1);`;

        if (fileType === 'image') {
            mediaElement = document.createElement('img');
            mediaElement.src = e.target.result;
            mediaElement.alt = "Pratinjau Gambar";
            mediaElement.style.cssText = commonStyle;
        } else { // Video
            mediaElement = document.createElement('video');
            mediaElement.src = e.target.result;
            mediaElement.controls = false; // No controls in preview
            mediaElement.muted = true; // Mute preview
            mediaElement.style.cssText = commonStyle;
        }
        previewContainer.appendChild(mediaElement);

        // Create and add the cancel button *inside* the container
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-media'; // Keep the ID for potential CSS targeting
        cancelBtn.type = 'button'; // Important for forms
        cancelBtn.innerHTML = '×';
        cancelBtn.title = 'Batal Media';
        // Style the cancel button (can also be done entirely in CSS via ID/class)
        cancelBtn.style.position = 'absolute';
        cancelBtn.style.top = '-6px';
        cancelBtn.style.right = '-6px';
        cancelBtn.style.background = 'rgba(40, 40, 40, 0.8)';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '50%';
        cancelBtn.style.width = '20px';
        cancelBtn.style.height = '20px';
        cancelBtn.style.fontSize = '11px';
        cancelBtn.style.lineHeight = '20px';
        cancelBtn.style.textAlign = 'center';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.padding = '0';
        cancelBtn.style.display = 'flex';
        cancelBtn.style.alignItems = 'center';
        cancelBtn.style.justifyContent = 'center';
        cancelBtn.style.zIndex = '1';
        cancelBtn.onclick = clearMediaPreview; // Add click handler

        previewContainer.appendChild(cancelBtn);

        // Append the whole container to the mediaPreview element
        mediaPreview.appendChild(previewContainer);

        selectedMedia = { file, type: fileType }; // Store file info
    };
     reader.onerror = () => {
         alert("Gagal membaca file untuk pratinjau.");
         clearMediaPreview();
     };
    reader.readAsDataURL(file);
}

async function handleMediaUpload(file, type) {
    if (!file || !submitButton || !supabaseClient) return null;

    submitButton.disabled = true;

    try {
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 50);
        const filePath = `chat_media/${timestamp}_${safeFileName}`;

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('images') // MAKE SURE 'images' IS YOUR BUCKET NAME
            .upload(filePath, file, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage
            .from('images')
            .getPublicUrl(filePath);

        if (!urlData || !urlData.publicUrl) throw new Error('Gagal mendapatkan URL publik.');

        return { url: urlData.publicUrl, type: type };

    } catch (error) {
        console.error('Supabase Upload/URL Error:', error);
        alert(`Gagal mengunggah media: ${error.message || 'Terjadi kesalahan'}. Coba lagi.`);
        return null;
    } finally {
        submitButton.disabled = false;
    }
}


// --- Chat Message Logic ---
function startEditingComment(commentKey, currentText) {
    if (!commentInput || !submitButton) return;

    currentEditingCommentKey = commentKey;
    commentInput.value = currentText;
    commentInput.focus();
    autoResizeTextarea();

    submitButton.classList.add('editing');
    submitButton.title = "Simpan Edit";
    addCancelEditButton();

    commentInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    clearMediaPreview();
    if (mediaInput) mediaInput.disabled = true;
    const uploadLabel = document.querySelector('.upload-label');
    if (uploadLabel) uploadLabel.style.display = 'none';
}

function addCancelEditButton() {
    if (document.getElementById('cancel-edit') || !submitButton?.parentNode) return;

    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancel-edit';
    cancelButton.type = 'button';
    cancelButton.classList.add('cancel-button'); // Use class for styling in gaya.css
    cancelButton.title = 'Batal Edit';
    // cancelButton.textContent = '✖'; // Let CSS handle content if preferred

    cancelButton.addEventListener('click', cancelEditing);
    submitButton.parentNode.insertBefore(cancelButton, submitButton.nextSibling);
}

function removeCancelEditButton() {
    const cancelButton = document.getElementById('cancel-edit');
    if (cancelButton) cancelButton.remove();
}

function cancelEditing() {
    if (!commentInput || !submitButton) return;

    currentEditingCommentKey = null;
    commentInput.value = '';
    autoResizeTextarea();
    submitButton.classList.remove('editing');
    submitButton.title = "Kirim";
    removeCancelEditButton();

    clearMediaPreview();
    if (mediaInput) mediaInput.disabled = false;
    const uploadLabel = document.querySelector('.upload-label');
    if (uploadLabel) uploadLabel.style.display = 'flex';
}

async function handleCommentSubmit() {
    if (!usernameInput || !commentInput || !submitButton || !commentsRef) return;

    const username = usernameInput.value.trim();
    const commentText = commentInput.value.trim();

    if (!username) {
        alert('Isi nama Anda!');
        usernameInput.focus();
        return;
    }
    if (!commentText && !selectedMedia) {
        alert('Isi pesan atau pilih media!');
        commentInput.focus();
        return;
    }

    if (submitButton.classList.contains('editing') && !currentEditingCommentKey) {
        console.warn("Attempted to save edit without an active editing key.");
        cancelEditing();
        return;
    }

    submitButton.disabled = true;
    removeTypingStatus();

    try {
        let mediaUrl = null;
        let mediaType = null;

        if (!currentEditingCommentKey && selectedMedia && selectedMedia.file) {
            const uploadResult = await handleMediaUpload(selectedMedia.file, selectedMedia.type);
            if (uploadResult) {
                mediaUrl = uploadResult.url;
                mediaType = uploadResult.type;
            } else {
                submitButton.disabled = false;
                return;
            }
        }

        const timestamp = firebase.database.ServerValue.TIMESTAMP;

        if (currentEditingCommentKey) {
            const updates = {
                text: commentText,
                isEdited: true,
                editedAt: timestamp
            };
            await commentsRef.child(currentEditingCommentKey).update(updates);
            cancelEditing();

        } else {
            const newCommentData = {
                username: username,
                text: commentText,
                timestamp: timestamp,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                isEdited: false,
                editedAt: null
            };
            await commentsRef.push(newCommentData);

            localStorage.setItem('todUsername', username);
            commentInput.value = '';
            clearMediaPreview();
            autoResizeTextarea();
        }

    } catch (error) {
        console.error('Error sending/editing comment:', error);
        alert('Gagal mengirim/mengedit pesan: ' + (error.message || 'Coba lagi'));
        if (currentEditingCommentKey) {
            cancelEditing();
        }
    } finally {
        if (submitButton.disabled) {
            submitButton.disabled = false;
        }
         if (!currentEditingCommentKey && submitButton.disabled === false && (commentInput.value || selectedMedia)) {
             // Added check: only clear if input/media wasn't already cleared by success path
             commentInput.value = '';
             clearMediaPreview();
             autoResizeTextarea();
         }
    }
}

// --- Displaying Comments ---
function loadComments() {
    if (!commentsContainer || !commentsRef) return;

    commentsRef.off();

    commentsRef.orderByChild('timestamp').on('child_added', (snapshot) => {
        const commentData = snapshot.val();
        const commentKey = snapshot.key;
        if (commentData && !document.getElementById(commentKey)) {
            const commentElement = createCommentElement(commentData, commentKey);
            commentsContainer.appendChild(commentElement);
             const shouldScroll = commentsContainer.scrollHeight > lastScrollHeight + 50;
             scrollToBottom(shouldScroll);
        }
    }, error => console.error("Firebase child_added error:", error));

    commentsRef.on('child_changed', (snapshot) => {
        const commentData = snapshot.val();
        const commentKey = snapshot.key;
        const existingElement = document.getElementById(commentKey);
        if (commentData && existingElement) {
            const currentScrollTop = commentsContainer.scrollTop;
            const oldHeight = commentsContainer.scrollHeight;
            const updatedElement = createCommentElement(commentData, commentKey);
            existingElement.replaceWith(updatedElement);
             const newHeight = commentsContainer.scrollHeight;
             commentsContainer.scrollTop = currentScrollTop + (newHeight - oldHeight);
        }
    }, error => console.error("Firebase child_changed error:", error));

    // Optional: child_removed listener
}

function createCommentElement(comment, key) {
    const div = document.createElement('div');
    div.className = 'comment';
    div.id = key;

    if (!comment || typeof comment.username !== 'string') {
        console.warn("Invalid comment data received:", comment);
        div.style.display = 'none';
        return div;
    }

    const currentUsername = usernameInput ? usernameInput.value.trim() : '';
    const isOwnMessage = comment.username === currentUsername && comment.username !== 'Sistem';
    const isSystemMsg = comment.username === 'Sistem' || comment.isSystemMessage;

    // Add Classes for Styling
    if (comment.isTypingIndicator) {
        div.classList.add('typing-indicator');
    } else if (isSystemMsg) {
        div.classList.add('system');
    } else if (isOwnMessage) {
        div.classList.add('sent');
    } else {
        div.classList.add('received');
    }

    // Typing Indicator
    if (comment.isTypingIndicator) {
        div.innerHTML = `
            <div class="comment-header">
                <span class="comment-username">${escapeHTML(comment.username)}</span>
                <span class="comment-date">mengetik...</span>
            </div>`;
        return div;
    }

    // Regular/System Messages
    const timestamp = comment.timestamp ? new Date(comment.timestamp) : null;
    const formattedTime = timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

    let mediaHtml = '';
    if (comment.mediaUrl && typeof comment.mediaUrl === 'string') {
        // Use CSS classes for styling media elements within comments
        const safeUrl = escapeHTML(comment.mediaUrl);
        if (comment.mediaType === 'image') {
            // Added onclick for modal view, add 'comment-media-image' class
            mediaHtml = `<img src="${safeUrl}" alt="Gambar Terlampir" class="comment-media comment-media-image" onclick="showImageModal('${safeUrl}')" loading="lazy">`;
        } else if (comment.mediaType === 'video') {
            // Add 'comment-media-video' class
            mediaHtml = `<video src="${safeUrl}" controls class="comment-media comment-media-video" preload="metadata"></video>`;
        }
    }

    const escapedTextForEdit = JSON.stringify(comment.text || '');
    const editButtonHtml = (isOwnMessage && !isSystemMsg) ?
        `<button class="edit-button" title="Edit Pesan" onclick='startEditingComment("${key}", ${escapedTextForEdit})'>Edit</button>` : '';
    const editedLabelHtml = comment.isEdited ? `<span class="edited-label" title="Diedit">(diedit)</span>` : '';

    // Build inner HTML
    if (isSystemMsg) {
        div.innerHTML = `<div class="comment-body">${escapeHTML(comment.text)}</div>`;
    } else {
        const showUsername = div.classList.contains('received');
        const usernameHtml = showUsername ? `<span class="comment-username">${escapeHTML(comment.username)}</span>` : '';
        const textHtml = comment.text ? `<div class="comment-text">${escapeHTML(comment.text)}</div>` : '';

        div.innerHTML = `
            <div class="comment-header">
                ${usernameHtml}
                 <span class="comment-meta-spacer"></span> <!-- Pushes meta right -->
                 ${editedLabelHtml}
                 ${editButtonHtml}
                 <span class="comment-date">${formattedTime}</span>
            </div>
            <div class="comment-body">
                ${textHtml}
                ${mediaHtml}
            </div>
        `;
    }
    return div;
}

// --- MODAL FUNCTION: Reworked for better CSS integration ---
function showImageModal(imageUrl) {
    // 1. Remove existing modal if any
    const existingModal = document.getElementById('imageModal');
    if (existingModal) existingModal.remove();

    // 2. Create modal elements
    const modal = document.createElement('div');
    modal.id = 'imageModal'; // Use ID for CSS targeting
    // Click background to close - Added 'closing' class logic
    modal.onclick = () => {
        modal.classList.add('closing'); // Add class to trigger fade-out
        const imgContent = modal.querySelector('#modalImageContent');
        if(imgContent) imgContent.classList.add('closing'); // Trigger image scale-down
        // Remove after animation (match CSS transition duration)
        setTimeout(() => modal.remove(), 300);
    };

    const img = document.createElement('img');
    img.id = 'modalImageContent'; // Use ID for CSS targeting
    img.src = imageUrl;
    img.alt = "Tampilan Gambar Penuh";
    // Prevent closing when clicking the image itself
    img.onclick = (e) => e.stopPropagation();

    // 3. Append image to modal, modal to body
    modal.appendChild(img);
    document.body.appendChild(modal); // IMPORTANT: Append to body

    // 4. Trigger the opening animation using classes
    // Force reflow/repaint before adding 'visible' class
    void modal.offsetWidth;
    modal.classList.add('visible');
    img.classList.add('visible');
}


// --- Typing Status Logic ---
function listenForTypingStatus() {
    if (!typingStatusRef || !commentsContainer || !usernameInput) return;

    typingStatusRef.on('value', (snapshot) => {
        document.querySelectorAll('.comment.typing-indicator').forEach(el => el.remove());

        const typingUsers = snapshot.val() || {};
        const currentUsername = usernameInput.value.trim();
        let indicatorAdded = false;

        Object.keys(typingUsers).forEach(username => {
            const userData = typingUsers[username];
            const isStale = userData.timestamp && (Date.now() - userData.timestamp > 800);

            if (username !== currentUsername && !isStale) {
                const typingIndicatorData = { username: username, isTypingIndicator: true };
                const indicatorElement = createCommentElement(typingIndicatorData, `typing-${username}`);
                commentsContainer.appendChild(indicatorElement);
                indicatorAdded = true;
            } else if (isStale) {
                 typingStatusRef.child(username).remove().catch(()=>{});
            }
        });

        if (indicatorAdded) scrollToBottom();

    }, error => console.error("Firebase typing status error:", error));
}

function removeTypingStatus() {
    if (!usernameInput || !typingStatusRef) return;
    const username = usernameInput.value.trim();
    if (username) {
        typingStatusRef.child(username).remove().catch(() => {});
    }
}

function handleTypingInput() {
    if (!usernameInput || !commentInput || !typingStatusRef) return;

    autoResizeTextarea();

    const username = usernameInput.value.trim();
    if (username) {
        if (commentInput.value.trim() !== '') {
            typingStatusRef.child(username).set({
                isTyping: true,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).catch(error => console.warn("Could not set typing status:", error.message));
        } else {
            removeTypingStatus();
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(removeTypingStatus, 800);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    if (!getElements()) {
         return;
    }

    const savedUsername = localStorage.getItem('todUsername');
    if (savedUsername && usernameInput) {
        usernameInput.value = savedUsername;
    }

    if (displayTextElement) {
        displayTextElement.textContent = defaultText;
    }

    // --- Add Event Listeners ---
    if (submitButton) submitButton.addEventListener('click', handleCommentSubmit);
    if (mediaInput) mediaInput.addEventListener('change', handleFileSelect);
    if (commentInput) {
         commentInput.addEventListener('input', handleTypingInput);
         autoResizeTextarea.call(commentInput); // Use call or apply to set 'this' correctly
    }
    // Cancel media button is now added dynamically in handleFileSelect,
    // its click handler is attached there directly (clearMediaPreview).

    // --- Load Initial Data ---
    loadComments();
    listenForTypingStatus();

    setTimeout(() => scrollToBottom(true), 500);
});

window.addEventListener('beforeunload', removeTypingStatus);

// Make functions globally accessible
window.Gettrut = Gettrut;
window.Getdare = Getdare;
window.closePopup = closePopup;
window.showText = showText;
window.clearText = clearText;
window.showImageModal = showImageModal;
window.startEditingComment = startEditingComment;
