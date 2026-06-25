const clostBtn = document.querySelector('.close-btn');
const modalWindow = document.querySelector('#modal');
const modalContent = document.querySelector('.modal-content');
const detailPage = document.querySelector('.detailPage');
const reviewPage = document.querySelector('.reviewPage');
const qnaPage = document.querySelector('.qnaPage');
const guidePage = document.querySelector('.guidePage');
const detailCon = document.querySelector('.productDetail');
const reviewCon = document.querySelector('#prdReview');
const qnaCon = document.querySelector('#prdQnA');
const guideCon = document.querySelector('.detail_guide');

clostBtn.addEventListener('click', function() {
    event.preventDefault();
    modalWindow.style.display = 'none';
    detailCon.style.display = 'none';
    reviewCon.style.display = 'none';
    qnaCon.style.display = 'none';
    guideCon.style.display = 'none';

})

detailPage.addEventListener('click', function() {
    event.preventDefault();
    modalWindow.style.display = 'block';
    detailCon.style.display = 'block';
    reviewCon.style.display = 'none';
    qnaCon.style.display = 'none';
    guideCon.style.display = 'none';
})

reviewPage.addEventListener('click', function() {
    event.preventDefault();
    modalWindow.style.display = 'block';
    detailCon.style.display = 'none';
    reviewCon.style.display = 'block';
    qnaCon.style.display = 'none';
    guideCon.style.display = 'none';
})

qnaPage.addEventListener('click', function() {
    event.preventDefault();
    modalWindow.style.display = 'block';
    detailCon.style.display = 'none';
    reviewCon.style.display = 'none';
    qnaCon.style.display = 'block';
    guideCon.style.display = 'none';
})

guidePage.addEventListener('click', function() {
    event.preventDefault();
    modalWindow.style.display = 'block';
    detailCon.style.display = 'none';
    reviewCon.style.display = 'none';
    qnaCon.style.display = 'none';
    guideCon.style.display = 'block';
})