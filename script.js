
// 경기도 주요 시의 격자 좌표 (기상청 격자 좌표계)
const cityCoordinates = {
    ansan: { nx: 58, ny: 122, name: "안산시" },
    suwon: { nx: 60, ny: 121, name: "수원시" },
    yongin: { nx: 61, ny: 120, name: "용인시" },
    seongnam: { nx: 62, ny: 123, name: "성남시" },
    bucheon: { nx: 56, ny: 125, name: "부천시" },
    anyang: { nx: 59, ny: 123, name: "안양시" },
    goyang: { nx: 57, ny: 128, name: "고양시" },
    namyangju: { nx: 64, ny: 128, name: "남양주시" }
};

// API 설정 (실제 사용 시에는 발급받은 서비스키를 사용해야 합니다)
const API_KEY = 'YOUR_API_KEY_HERE'; // 실제 API 키로 변경 필요
const BASE_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

// DOM 요소들
const citySelect = document.getElementById('citySelect');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const weatherInfo = document.getElementById('weatherInfo');
const errorMessage = document.getElementById('errorMessage');

// 날씨 아이콘 매핑
const weatherIcons = {
    '맑음': 'fas fa-sun',
    '구름많음': 'fas fa-cloud-sun',
    '흐림': 'fas fa-cloud',
    '비': 'fas fa-cloud-rain',
    '눈': 'fas fa-snowflake',
    '소나기': 'fas fa-cloud-showers-heavy'
};

// 이벤트 리스너
getWeatherBtn.addEventListener('click', getWeatherData);
citySelect.addEventListener('change', function() {
    if (this.value) {
        getWeatherBtn.disabled = false;
    }
});

// 현재 시간 포맷팅
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long'
    });
}

// 날짜/시간 포맷 (YYYYMMDD, HHMM)
function getDateTimeFormat() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    let hour = now.getHours();
    
    // 기상청 API는 3시간 간격으로 데이터 제공 (02, 05, 08, 11, 14, 17, 20, 23시)
    const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
    let baseTime = baseHours.reduce((prev, curr) => {
        return Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev;
    });
    
    // 현재 시간이 발표시간보다 이르면 이전 발표시간 사용
    if (hour < baseTime) {
        const prevIndex = baseHours.indexOf(baseTime) - 1;
        if (prevIndex >= 0) {
            baseTime = baseHours[prevIndex];
        } else {
            baseTime = 23;
            // 전날로 이동
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return {
                baseDate: yesterday.getFullYear() + 
                         String(yesterday.getMonth() + 1).padStart(2, '0') + 
                         String(yesterday.getDate()).padStart(2, '0'),
                baseTime: String(baseTime).padStart(2, '0') + '00'
            };
        }
    }
    
    return {
        baseDate: year + month + day,
        baseTime: String(baseTime).padStart(2, '0') + '00'
    };
}

// UI 상태 관리
function showLoading() {
    hideAllSections();
    loadingSpinner.classList.remove('hidden');
}

function showWeatherInfo() {
    hideAllSections();
    weatherInfo.classList.remove('hidden');
}

function showError() {
    hideAllSections();
    errorMessage.classList.remove('hidden');
}

function hideAllSections() {
    loadingSpinner.classList.add('hidden');
    weatherInfo.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

// 날씨 데이터 파싱
function parseWeatherData(items) {
    const currentData = {};
    const currentTime = new Date().getHours();
    
    // 현재 시간에 가장 가까운 시간대의 데이터 추출
    items.forEach(item => {
        const fcstTime = parseInt(item.fcstTime.substring(0, 2));
        if (Math.abs(fcstTime - currentTime) <= 3) { // 3시간 이내의 데이터
            currentData[item.category] = item.fcstValue;
        }
    });
    
    return {
        temperature: currentData.TMP || '--', // 온도
        humidity: currentData.REH || '--', // 상대습도
        precipitation: currentData.POP || '--', // 강수확률
        windSpeed: currentData.WSD || '--', // 풍속
        skyCondition: getSkyCondition(currentData.SKY, currentData.PTY) // 하늘상태
    };
}

// 하늘 상태 해석
function getSkyCondition(sky, pty) {
    if (pty && pty !== '0') {
        switch (pty) {
            case '1': return '비';
            case '2': return '비/눈';
            case '3': return '눈';
            case '4': return '소나기';
            default: return '비';
        }
    }
    
    switch (sky) {
        case '1': return '맑음';
        case '3': return '구름많음';
        case '4': return '흐림';
        default: return '맑음';
    }
}

// 날씨 정보 표시
function displayWeatherInfo(cityName, weatherData) {
    document.getElementById('cityName').textContent = cityName;
    document.getElementById('currentTime').textContent = getCurrentTime();
    document.getElementById('temperature').textContent = weatherData.temperature;
    document.getElementById('humidity').textContent = weatherData.humidity + '%';
    document.getElementById('precipitation').textContent = weatherData.precipitation + '%';
    document.getElementById('windSpeed').textContent = weatherData.windSpeed + ' m/s';
    document.getElementById('weatherCondition').textContent = weatherData.skyCondition;
    document.getElementById('feelsLike').textContent = calculateFeelsLike(weatherData.temperature) + '°C';
    
    // 날씨 아이콘 설정
    const iconElement = document.getElementById('weatherIcon');
    const iconClass = weatherIcons[weatherData.skyCondition] || 'fas fa-sun';
    iconElement.className = iconClass;
    
    showWeatherInfo();
}

// 체감온도 계산 (간단한 추정)
function calculateFeelsLike(temp) {
    if (temp === '--') return '--';
    const temperature = parseFloat(temp);
    // 간단한 체감온도 계산식 (실제로는 더 복잡한 공식 사용)
    return Math.round(temperature - 2);
}

// 날씨 데이터 조회 (더미 데이터 사용)
async function getWeatherData() {
    const selectedCity = citySelect.value;
    if (!selectedCity) {
        alert('지역을 선택해주세요.');
        return;
    }
    
    const cityInfo = cityCoordinates[selectedCity];
    showLoading();
    
    try {
        // 실제 API 호출 대신 더미 데이터 사용 (개발/테스트용)
        // 실제 구현시에는 아래의 더미 데이터 대신 실제 API를 호출해야 합니다.
        
        setTimeout(() => {
            const dummyWeatherData = generateDummyWeatherData();
            displayWeatherInfo(cityInfo.name, dummyWeatherData);
        }, 1500);
        
        /* 실제 API 호출 코드 (서비스키가 필요합니다)
        const dateTime = getDateTimeFormat();
        const url = `${BASE_URL}?serviceKey=${API_KEY}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${dateTime.baseDate}&base_time=${dateTime.baseTime}&nx=${cityInfo.nx}&ny=${cityInfo.ny}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.response.header.resultCode === '00') {
            const weatherData = parseWeatherData(data.response.body.items.item);
            displayWeatherInfo(cityInfo.name, weatherData);
        } else {
            throw new Error('API 호출 실패');
        }
        */
        
    } catch (error) {
        console.error('날씨 데이터 조회 실패:', error);
        showError();
    }
}

// 더미 날씨 데이터 생성 (개발/테스트용)
function generateDummyWeatherData() {
    const conditions = ['맑음', '구름많음', '흐림', '비'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
        temperature: Math.floor(Math.random() * 30) + 5, // 5-35도
        humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
        precipitation: Math.floor(Math.random() * 100), // 0-100%
        windSpeed: (Math.random() * 10).toFixed(1), // 0-10 m/s
        skyCondition: randomCondition
    };
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 페이지 로드 시 초기 설정
    getWeatherBtn.disabled = true;
    
    // 안산시를 기본으로 선택
    citySelect.value = 'ansan';
    getWeatherBtn.disabled = false;
});
