
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('dateInput');
    const searchBtn = document.getElementById('searchBtn');
    const mealInfo = document.getElementById('mealInfo');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    // 오늘 날짜를 기본값으로 설정
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    dateInput.value = todayString;
    
    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', searchMealInfo);
    
    // 엔터키 이벤트
    dateInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMealInfo();
        }
    });
    
    // 급식 정보 검색 함수
    async function searchMealInfo() {
        const selectedDate = dateInput.value;
        
        if (!selectedDate) {
            alert('날짜를 선택해주세요.');
            return;
        }
        
        // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
        const formattedDate = selectedDate.replace(/-/g, '');
        
        // UI 상태 변경
        showLoading();
        hideError();
        
        try {
            const mealData = await fetchMealData(formattedDate);
            displayMealInfo(mealData, selectedDate);
        } catch (err) {
            console.error('급식 정보 조회 실패:', err);
            showError();
        } finally {
            hideLoading();
        }
    }
    
    // 급식 데이터 가져오기
    async function fetchMealData(date) {
        const apiUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530079&MLSV_YMD=${date}`;
        
        // CORS 문제 해결을 위해 프록시 서버 사용
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlText = await response.text();
        return parseXMLResponse(xmlText);
    }
    
    // XML 응답 파싱
    function parseXMLResponse(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // 파싱 에러 확인
        const parserError = xmlDoc.getElementsByTagName("parsererror");
        if (parserError.length > 0) {
            throw new Error('XML 파싱 에러');
        }
        
        const mealInfo = [];
        const rows = xmlDoc.getElementsByTagName('row');
        
        if (rows.length === 0) {
            return null; // 급식 정보가 없음
        }
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const mealName = getElementValue(row, 'MMEAL_SC_NM') || '급식';
            const dishes = getElementValue(row, 'DDISH_NM') || '';
            const calories = getElementValue(row, 'CAL_INFO') || '';
            const nutrition = getElementValue(row, 'NTR_INFO') || '';
            const origin = getElementValue(row, 'ORPLC_INFO') || '';
            
            mealInfo.push({
                mealName: mealName,
                dishes: dishes,
                calories: calories,
                nutrition: nutrition,
                origin: origin
            });
        }
        
        return mealInfo;
    }
    
    // XML 요소 값 가져오기
    function getElementValue(parent, tagName) {
        const element = parent.getElementsByTagName(tagName)[0];
        return element ? element.textContent : '';
    }
    
    // 급식 정보 표시
    function displayMealInfo(mealData, date) {
        if (!mealData || mealData.length === 0) {
            mealInfo.innerHTML = `
                <div class="date-info">
                    <h3>${formatDate(date)}</h3>
                </div>
                <div class="meal-item">
                    <h3>급식 정보 없음</h3>
                    <div class="meal-content">
                        <p>해당 날짜에는 급식 정보가 없습니다.</p>
                        <p>주말이나 공휴일일 수 있습니다.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="date-info">
                <h3>${formatDate(date)} 급식 정보</h3>
            </div>
        `;
        
        mealData.forEach(meal => {
            const dishes = formatDishes(meal.dishes);
            const calories = meal.calories || '정보 없음';
            
            html += `
                <div class="meal-item">
                    <h3>${meal.mealName}</h3>
                    <div class="meal-content">
                        <h4>🍽️ 메뉴</h4>
                        ${dishes}
                        <br>
                        <p><strong>🔥 칼로리:</strong> ${calories}</p>
                    </div>
                </div>
            `;
        });
        
        mealInfo.innerHTML = html;
    }
    
    // 날짜 형식 변환 (YYYY-MM-DD -> YYYY년 MM월 DD일)
    function formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        
        return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
    }
    
    // 음식 목록 형식 변환
    function formatDishes(dishesString) {
        if (!dishesString) return '<p>메뉴 정보가 없습니다.</p>';
        
        // HTML 태그 제거 및 정리
        const cleanDishes = dishesString
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/\([^)]*\)/g, '') // 알레르기 정보 괄호 제거
            .split('\n')
            .map(dish => dish.trim())
            .filter(dish => dish.length > 0);
        
        if (cleanDishes.length === 0) {
            return '<p>메뉴 정보가 없습니다.</p>';
        }
        
        const dishList = cleanDishes.map(dish => `<li>${dish}</li>`).join('');
        return `<ul>${dishList}</ul>`;
    }
    
    // 로딩 표시
    function showLoading() {
        loading.style.display = 'block';
        mealInfo.style.display = 'none';
    }
    
    // 로딩 숨기기
    function hideLoading() {
        loading.style.display = 'none';
        mealInfo.style.display = 'block';
    }
    
    // 에러 표시
    function showError() {
        error.style.display = 'block';
        mealInfo.style.display = 'none';
    }
    
    // 에러 숨기기
    function hideError() {
        error.style.display = 'none';
    }
});
