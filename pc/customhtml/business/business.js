/* =====================================================
   BUSINESS INQUIRY — business.js
   Google Apps Script를 사용하여 폼 데이터를 이메일로 전송

   사전 준비:
   아래 APPS_SCRIPT_URL에 Google Apps Script 배포 후
   받은 웹 앱 URL을 붙여넣으세요.
===================================================== */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxIjaZD9GAmuRKVzFLsieNpry8zejgGPVPssvD6dmKwU-o-OtLJaH3xByNMEy536Qo/exec'; // ← 교체

/* ===========================
   유효성 검사
=========================== */
function validate(name, email, subject, message) {
    if (!name.trim())
        return '회사명 또는 성함을 입력해주세요.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return '올바른 이메일 주소를 입력해주세요.';
    if (!subject.trim())
        return '문의 제목을 입력해주세요.';
    if (!message.trim())
        return '문의 내용을 입력해주세요.';
    return null;
}

/* ===========================
   UI 상태 헬퍼
=========================== */
function setButtonState(btn, state) {
    const map = {
        idle:    { text: 'SUBMIT',   disabled: false },
        loading: { text: 'SENDING…', disabled: true  },
        success: { text: 'SENT ✓',   disabled: true  },
        error:   { text: 'RETRY',    disabled: false },
    };
    const s = map[state];
    btn.textContent = s.text;
    btn.disabled    = s.disabled;
}

function showMessage(id, text, color) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('p');
        el.id = id;
        el.style.cssText = `
            font-family: "GMarketSans", sans-serif;
            font-size: 14px;
            font-weight: 300;
            margin-top: 12px;
        `;
        document.getElementById('submit').insertAdjacentElement('afterend', el);
    }
    el.style.color   = color;
    el.textContent   = text;
    el.style.display = 'block';
}

function hideMessage(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

/* ===========================
   SUBMIT 이벤트 바인딩
=========================== */
document.addEventListener('DOMContentLoaded', function () {

    const btn = document.getElementById('submit');
    if (!btn) return;

    btn.addEventListener('click', async function () {

        hideMessage('inquiry-error');
        hideMessage('inquiry-success');

        const name    = document.getElementById('inquirerName').value;
        const email   = document.getElementById('inquirerEmail').value;
        const subject = document.getElementById('inquirerSubject').value;
        const message = document.getElementById('inquirerMessage').value;

        // 유효성 검사
        const errorMsg = validate(name, email, subject, message);
        if (errorMsg) {
            showMessage('inquiry-error', errorMsg, '#c00');
            return;
        }

        setButtonState(btn, 'loading');

        try {
            const res = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                // Google Apps Script는 CORS 제한으로 no-cors 필요
                // no-cors 사용 시 응답 본문을 읽을 수 없으므로
                // 전송 성공 여부는 에러 발생 여부로만 판단
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, subject, message }),
            });

            // no-cors 모드에서는 res.ok를 확인할 수 없으므로
            // fetch 자체가 throw 없이 완료되면 성공으로 처리
            setButtonState(btn, 'success');
            showMessage(
                'inquiry-success',
                '문의가 성공적으로 전송되었습니다. 빠른 시일 내에 답변 드리겠습니다.',
                '#090'
            );

            // 폼 초기화
            document.getElementById('inquirerName').value    = '';
            document.getElementById('inquirerEmail').value   = '';
            document.getElementById('inquirerSubject').value = '';
            document.getElementById('inquirerMessage').value = '';

        } catch (err) {
            console.error('전송 오류:', err);
            setButtonState(btn, 'error');
            showMessage(
                'inquiry-error',
                '전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                '#c00'
            );
        }
    });
});
