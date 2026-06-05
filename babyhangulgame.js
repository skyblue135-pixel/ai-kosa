// ==========================================
// 1. 단어 및 스테이지 데이터셋 정의
// ==========================================
const STAGES_DATA = {
    "우리 집": {
        emoji: "🏠",
        bgColor: "#FFF5F5",
        accentColor: "#FF8A8A",
        words: [
            { word: "텔레비전", emoji: "📺", hint: "거실에서 재미있는 만화를 보여주는 기계야!" },
            { word: "소파", emoji: "🛋️", hint: "폭신폭신해서 편하게 앉아서 쉴 수 있어!" },
            { word: "시계", emoji: "🕰️", hint: "째깍째깍 지금이 몇 시인지 바늘로 알려줘요!" }
        ]
    },
    "놀이터": {
        emoji: "🛝",
        bgColor: "#F3FFF3",
        accentColor: "#7FD8BE",
        words: [
            { word: "그네", emoji: "🪵", hint: "하늘 높이 슝슝 바람을 가르며 타는 놀이기구야!" },
            { word: "모래", emoji: "⏳", hint: "두껍아 두껍아~ 성을 쌓고 소꿉놀이를 해요!" },
            { word: "미끄럼틀", emoji: "🛝", hint: "영차영차 계단을 올라가서 아래로 슈우웅 내려와요!" }
        ]
    },
    "마트": {
        emoji: "🛒",
        bgColor: "#F0F4FF",
        accentColor: "#8ECAE6",
        words: [
            { word: "사과", emoji: "🍎", hint: "백설공주도 반한 빨갛고 달콤아삭한 과일이야!" },
            { word: "우유", emoji: "🥛", hint: "젖소 친구가 선물해 준 하얗고 고소한 음료수!" },
            { word: "빵", emoji: "🍞", hint: "오븐에서 고소한 냄새를 풍기며 갓 구워져 나왔어!" }
        ]
    }
};

// ==========================================
// 2. 가상 오디오 신디사이저 (귀여운 레트로 효과음 재생기)
// ==========================================
const playSound = (type) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (type === 'correct') {
            // 고음의 상큼한 딩동음
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, ctx.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); 
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'wrong') {
            // 묵직한 낮은 뿅- 음
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } else if (type === 'success') {
            // 미파솔도 화음 아르페지오
            const notes = [523.25, 659.25, 783.99, 1046.50]; 
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
                gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.08);
                osc.stop(ctx.currentTime + i * 0.08 + 0.4);
            });
        } else if (type === 'fanfare') {
            // 풍성한 나팔 불기 사운드
            const notes = [392.00, 523.25, 659.25, 783.99]; 
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
                gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.08);
                osc.stop(ctx.currentTime + i * 0.08 + 0.6);
            });
        }
    } catch (e) {
        console.log('오디오 재생 허용 필요');
    }
};

// ==========================================
// 3. 상태 관리 변수
// ==========================================
let starsEarned = 0;
let completedStages = [];
let currentStage = null;
let currentWordIdx = 0;
let spelledWord = [];
let targetWord = '';
let currentHint = '';

// ==========================================
// 4. 로컬 스토리지 연동 (세이브/로드 기능)
// ==========================================
const loadProgress = () => {
    const saved = localStorage.getItem('hangul_adventure_progress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            starsEarned = data.stars || 0;
            completedStages = data.completedStages || [];
        } catch (e) {
            starsEarned = 0;
            completedStages = [];
        }
    }
    updateSelectScreenUI();
};

const saveProgress = () => {
    const data = {
        stars: starsEarned,
        completedStages: completedStages
    };
    localStorage.setItem('hangul_adventure_progress', JSON.stringify(data));
    updateSelectScreenUI();
};

// 커스텀 팝업으로 사용자 질문 대체
const resetProgress = () => {
    document.getElementById('modal-reset-confirm').classList.remove('hidden');
};

const closeResetModal = () => {
    document.getElementById('modal-reset-confirm').classList.add('hidden');
};

const executeResetProgress = () => {
    starsEarned = 0;
    completedStages = [];
    saveProgress();
    loadProgress();
    closeResetModal();
};

// ==========================================
// 5. 화면 라우팅 시스템 (멀티 페이지 전환)
// ==========================================
const changeView = (viewName) => {
    document.getElementById('view-intro').classList.add('hidden');
    document.getElementById('view-select').classList.add('hidden');
    document.getElementById('view-play').classList.add('hidden');

    if (viewName === 'intro') {
        document.getElementById('view-intro').classList.remove('hidden');
    } else if (viewName === 'select') {
        document.getElementById('view-select').classList.remove('hidden');
        updateSelectScreenUI();
    } else if (viewName === 'play') {
        document.getElementById('view-play').classList.remove('hidden');
    }
};

const updateSelectScreenUI = () => {
    document.getElementById('star-counter').innerHTML = `내 별 조각: ⭐️ ${starsEarned}개`;
    
    // 각 스테이지 참잘했어요 뱃지 제어
    const homeBadge = document.getElementById('badge-home');
    const homeBtn = document.getElementById('btn-stage-home');
    if (completedStages.includes('우리 집')) {
        homeBadge.classList.remove('hidden');
        homeBtn.classList.add('border-[#FF8A8A]');
    } else {
        homeBadge.classList.add('hidden');
        homeBtn.classList.remove('border-[#FF8A8A]');
    }

    const playBadge = document.getElementById('badge-playground');
    const playBtn = document.getElementById('btn-stage-playground');
    if (completedStages.includes('놀이터')) {
        playBadge.classList.remove('hidden');
        playBtn.classList.add('border-[#7FD8BE]');
    } else {
        playBadge.classList.add('hidden');
        playBtn.classList.remove('border-[#7FD8BE]');
    }

    const martBadge = document.getElementById('badge-mart');
    const martBtn = document.getElementById('btn-stage-mart');
    if (completedStages.includes('마트')) {
        martBadge.classList.remove('hidden');
        martBtn.classList.add('border-[#8ECAE6]');
    } else {
        martBadge.classList.add('hidden');
        martBtn.classList.remove('border-[#8ECAE6]');
    }
};

// ==========================================
// 6. 게임 실시간 플레이 엔진 로직
// ==========================================
const startStage = (stageName) => {
    currentStage = stageName;
    currentWordIdx = 0;
    showGamePlay();
};

const showGamePlay = () => {
    const stageInfo = STAGES_DATA[currentStage];
    const wordsList = stageInfo.words;

    // 스테이지 완료 조건
    if (currentWordIdx >= wordsList.length) {
        celebrateStageClear();
        return;
    }

    const currentData = wordsList[currentWordIdx];
    targetWord = currentData.word;
    currentHint = currentData.hint;
    spelledWord = [];

    // UI 테마 색 입히기
    const playView = document.getElementById('view-play');
    playView.style.backgroundColor = stageInfo.bgColor;

    // 상단 타이틀 업데이트
    document.getElementById('play-title').innerHTML = `${stageInfo.emoji} ${currentStage} (${currentWordIdx + 1}/${wordsList.length})`;

    // 캐릭터 설명창 업데이트
    updateBabySpeech(`안녕! 친구야! 우리 ${currentData.emoji} 글자를 완성해볼까?<br>💡 <b>${currentHint}</b>`);

    // 중앙 이모지 전시관 업데이트
    document.getElementById('target-emoji').innerHTML = currentData.emoji;

    // 글자 빈 공간 슬롯 그리기
    updateWordSlots();

    // 낱글자 선택지 자석 생성
    createLetterMagnets();

    changeView('play');
};

const updateBabySpeech = (text, isWrong = false) => {
    const speechLabel = document.getElementById('baby-speech');
    speechLabel.innerHTML = text;
    if (isWrong) {
        speechLabel.classList.add('text-red-600');
        speechLabel.classList.remove('text-gray-700');
    } else {
        speechLabel.classList.remove('text-red-600');
        speechLabel.classList.add('text-gray-700');
    }
};

const updateWordSlots = () => {
    const slotContainer = document.getElementById('word-slots');
    slotContainer.innerHTML = '';

    for (let i = 0; i < targetWord.length; i++) {
        const charBox = document.createElement('div');
        charBox.className = "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-bold transition-all duration-200 shadow-md border-2";
        
        if (i < spelledWord.length) {
            charBox.innerText = spelledWord[i];
            charBox.className += " bg-[#E8F8F5] text-[#2A9D8F] border-[#2A9D8F]";
        } else {
            charBox.innerText = "？";
            charBox.className += " bg-gray-200 text-gray-400 border-gray-300";
        }
        slotContainer.appendChild(charBox);
    }
};

const createLetterMagnets = () => {
    const choiceContainer = document.getElementById('letter-choices');
    choiceContainer.innerHTML = '';

    const targetChars = targetWord.split('');
    const distractorPool = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하", "구", "우", "기", "소", "머", "리"];
    
    // 적합한 수의 오답 단어 무작위 선출
    const neededDistractorsCount = Math.max(6 - targetChars.length, 3);
    const distractors = [];
    while (distractors.length < neededDistractorsCount) {
        const r = distractorPool[Math.floor(Math.random() * distractorPool.length)];
        if (!targetChars.includes(r) && !distractors.includes(r)) {
            distractors.push(r);
        }
    }

    // 고유한 글자 보드 조합 및 무작위 셔플
    const allLetters = [...new Set([...targetChars, ...distractors])];
    allLetters.sort(() => Math.random() - 0.5);

    // 자석 버튼 엘리먼트 렌더링
    allLetters.forEach(char => {
        const btn = document.createElement('button');
        btn.className = "magnet-btn bg-white hover:bg-[#FFE3A8] text-gray-800 text-3xl font-bold w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center cursor-pointer border border-gray-300";
        btn.innerText = char;
        btn.onclick = () => handleMagnetClick(char);
        choiceContainer.appendChild(btn);
    });
};

// ==========================================
// 7. 클릭 매칭 및 베이비 피드백 시스템
// ==========================================
const handleMagnetClick = (char) => {
    const nextIdx = spelledWord.length;
    const correctChar = targetWord[nextIdx];

    if (char === correctChar) {
        // 한 글자 맞춤!
        spelledWord.push(char);
        updateWordSlots();
        playSound('correct');
        updateBabySpeech(`👶 베이비 선생님: 와아! 맞아! <b>'${char}'</b> 글자가 거기 들어가는구나! 정말 멋져! 👍`);

        // 단어 전체 조립 성공 검증
        if (spelledWord.length === targetWord.length) {
            starsEarned++;
            saveProgress();
            setTimeout(() => {
                celebrateWordClear();
            }, 800);
        }
    } else {
        // 틀린 오답 클릭
        playSound('wrong');
        updateBabySpeech(`👶 베이비 선생님: 에이~ 아쉽다! <b>'${char}'</b>은(는) 이번 칸이 아니야.<br>💡 다시 잘 떠올려 봐! ${currentHint} 🔍`, true);
    }
};

// 단어 정답 팝업 노출
const celebrateWordClear = () => {
    playSound('success');
    document.getElementById('word-clear-text').innerText = `'${targetWord}'을(를) 멋지게 다 조립했어!`;
    document.getElementById('modal-word-clear').classList.remove('hidden');
};

const nextWord = () => {
    document.getElementById('modal-word-clear').classList.add('hidden');
    currentWordIdx++;
    showGamePlay();
};

// 스테이지 정복 성공 축하
const celebrateStageClear = () => {
    if (!completedStages.includes(currentStage)) {
        completedStages.push(currentStage);
        saveProgress();
    }
    playSound('fanfare');
    document.getElementById('stage-clear-text').innerHTML = `'${currentStage}' 탐험지의 모든 한글 조각들을 다 맞췄어!<br>이제 주변 사물들을 완전 척척박사처럼 다 쓰겠네! ⭐🏅`;
    document.getElementById('modal-stage-clear').classList.remove('hidden');
};

const closeStageClearModal = () => {
    document.getElementById('modal-stage-clear').classList.add('hidden');
    changeView('select');
};

// 시작 시 데이터 로드 및 초기 인트로 보이기
window.onload = () => {
    loadProgress();
};