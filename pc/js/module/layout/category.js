window.addEventListener('load', function(){
	bottomNav();
    fixedHeader();
    handleNav();
    searchLayer();
	handleScroll();
});

function handleScroll(){
	var scrollPosition = 0;
	var ticking = false;
	window.addEventListener('scroll', function(e) {
        scrollPosition = window.scrollY || window.pageYOffset;
        if (ticking) return;
        window.requestAnimationFrame(function() {
            fixedHeader()
            ticking = false;
        });
        ticking = true;
	});
}

function toggleClass(element, handler, className){
	var _handler = document.querySelector(handler);
	var _element = document.querySelector(element);

    _handler.addEventListener('click', function(){
        if ( _element.classList.contains(className) ) {
            _element.classList.remove( className );
        } else {
            _element.classList.add( className );
        }
    });
}

function fixedHeader() {
    var header = document.getElementById("header");
	var fixed_margin = document.getElementById("contents");
	var scrollY = window.pageYOffset || document.documentElement.scrollTop;

	if(scrollY > header.offsetTop) {
        header.classList.add("fixed");
    } else {
        header.classList.remove("fixed");
		fixed_margin.style.marginTop  = '0px';
    }
}

function handleNav() {
    var btnNavs = document.querySelectorAll('.eNavFold');
    var btnClose = document.querySelector('#aside .btnClose');
    var dimmed = document.querySelector('#layoutDimmed');
    btnNavs.forEach( function(btnNav) {
        btnNav.addEventListener('click', function(){
            document.body.classList.add('expand');
        });
    });
    btnClose.addEventListener('click', function(){
        document.body.classList.remove('expand');
    });
    handleDimmed(dimmed, document.body, 'expand');
}

function searchLayer() {
    var btnSearchs = document.querySelectorAll('.eSearch');
    var btnClose = document.querySelector('.xans-layout-searchheader  .btnClose');
    btnSearchs.forEach( function(btnSearch) {
        btnSearch.addEventListener('click', function(){
            document.body.classList.add('searchExpand');
        });
    });
    btnClose.addEventListener('click', function(){
        document.body.classList.remove('searchExpand');
    });
    var dimmed = document.querySelector('#layoutDimmed');
    handleDimmed(dimmed, document.body, 'searchExpand');
}

function handleDimmed(target, element, className){
    target.addEventListener('click', function(){
        element.classList.remove(className);
    });
}

function bottomNav(){
    var btnTop = document.querySelector('.bottom-nav__top');
    var fixedButton = document.getElementById("orderFixArea");
    if(fixedButton){
        document.body.classList.add("button--fixed");
    };

	window.addEventListener("scroll", function(){
		var scroll = window.pageYOffset || document.documentElement.scrollTop;
        var nav = document.querySelector('.bottom-nav');
		if (scroll > lastScrollTop){
			nav.classList.add('bottom-nav--hide');
		} else {
			nav.classList.remove('bottom-nav--hide');
		}
		if(scroll === document.body.scrollHeight - document.documentElement.offsetHeight){
			nav.classList.remove('bottom-nav--hide');
		}
		lastScrollTop = scroll <= 0 ? 0 : scroll;

        var currentScrollPercentage = getCurrentScrollPercentage();
        if(currentScrollPercentage > 30){
        	btnTop.classList.add('bottom-nav__top--show');
        } else {
			btnTop.classList.remove('bottom-nav__top--show');
        }
	});

    btnTop.addEventListener('click', function(){
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
    });
}

function getCurrentScrollPercentage(){
	return (window.scrollY + window.innerHeight) / document.body.clientHeight * 100
}

jQuery(document).ready(function() {
	/* 최상단배너 하루동안 닫기 */
    jQuery(".main_top_banner .top_banner_box_inner .top_banner_close .icon").bind("click", function() {
		if(jQuery("#top_banner_box_cloase").is(":checked")){
			jQuery(".main_top_banner").slideUp("fast");
			setCookiem("top_banner_cookie", "top_banner_cookie", 1);
		 } else {
			jQuery(".main_top_banner").slideUp("fast");
		 }
    });
	var main_top_banner_diplay = jQuery(".main_top_banner").attr("data-ez-display");
	if (!getCookiem("top_banner_cookie") && (main_top_banner_diplay == 'visible')) {
		jQuery(".main_top_banner").slideDown("fast");
	}

	if(jQuery(".top_banner_close").css("display") == "none"){
		jQuery(".main_top_banner").addClass('close_none');
		if (main_top_banner_diplay == 'visible') {
			jQuery(".main_top_banner").slideDown("fast");
		}
	}

	/* 상단 고객센터 */
	jQuery("#header .inner .toparea .toparea_state .toparea_state_board").click(function() {
		jQuery(this).toggleClass('on');
	});

	/* 로그인폼 placeholder 추가 */
	if (jQuery('.xans-member-login').val() != undefined) {
		jQuery('#member_passwd').attr('placeholder', '비밀번호');
	}

	/* 비회원 주문조회페이지 placeholder 추가 */
	setTimeout(function(){
		if (jQuery('.xans-myshop-orderhistorynologin').val() != undefined) {
			jQuery('#order_name').attr('placeholder', '주문자명');
			jQuery('#order_id').attr('placeholder', '주문번호(하이픈(-) 포함)');
			jQuery('#order_password').attr('placeholder', '비회원주문 비밀번호');
		}
	}, 100);

	/* 멀티샵 없을경우 숨김 */
	jQuery(".xans-layout-multishoplist").each(function(){
		var multishoplist_count = jQuery('li', this).length;
		if ( multishoplist_count == 1 ) {
			jQuery(this).hide();
		}
	});

	/* 상단 카테고리 초기화 및 변경 감지 */
	top_category();
	observeTopCategory();
});

/* 상단 카테고리 변경 감지 */
function observeTopCategory(){
	var targetNode = jQuery('#header .xans-layout-category > ul')[0];
	var observer = new MutationObserver(function(mutationsList, observer) {
			top_category();
	});
	if (targetNode) {
			observer.observe(targetNode, { childList: true, subtree: true });
	}
}

/* =========================================================
   [개선된 top_category] W3C 웹 접근성 및 클릭 제어 로직 통합
   ========================================================= */
function top_category(){
	/* 1. 마우스 호버(Hover) 제어 & ARIA 상태 연동 */
	jQuery('#header .top_category li').off('mouseenter mouseleave').on('mouseenter', function(e) {
		jQuery(this).addClass('on');
		jQuery(this).children('a').attr('aria-expanded', 'true');
	}).on('mouseleave', function(e) {
		jQuery(this).removeClass('on');
		jQuery(this).children('a').attr('aria-expanded', 'false');
	});

	/* 2. 키보드 접근성(Focus) 제어 추가 */
	// 하위 메뉴 내부 링크를 포함하여 포커스가 들어올 때 부모 li들 전체에 .on 클래스 적용
	jQuery('#header .top_category li > a').off('focusin').on('focusin', function() {
		jQuery(this).parents('li').addClass('on');
		jQuery(this).parents('li').children('a').attr('aria-expanded', 'true');
	});

	// 포커스가 해당 카테고리 가지(Branch)를 완전히 빠져나갈 때 .on 제거 및 aria-expanded 갱신
	jQuery('#header .top_category li').off('focusout').on('focusout', function(e) {
		var $this = jQuery(this);
		// 포커스 이동 시점을 정확히 감지하기 위한 미세 시차 부여
		setTimeout(function() {
			if ($this.find(':focus').length === 0) {
				$this.removeClass('on');
				$this.children('a').attr('aria-expanded', 'false');
			}
		}, 10);
	});

	/* 3. 상단카테고리 중분류(자식 노드) 존재 여부 체크 */
	jQuery('#header .top_category ul.sub_cate01 li').each(function() {
		if (jQuery(this).children('ul').length == 0) {
			jQuery(this).addClass('noChild');
		}
	});

	/* 4. PC 대분류/중분류(하위 메뉴 보유) 클릭 시 페이지 이동 방지 */
	jQuery('#header .top_category li > a').off('click').on('click', function(e) {
		var hasSubMenu = jQuery(this).siblings('ul').length > 0;
		if (hasSubMenu) {
			e.preventDefault(); // 하위 카테고리가 있으면 최상단으로 튕기거나 리스트 이동하는 현상 방지
		}
	});
}

/* 쿠키 핸들러 */
function setCookiem(cookie_name, cookie_value, expire_date) {
    var today = new Date();
    var expire = new Date();
    expire.setTime(today.getTime() + 3600000 * 24 * expire_date);
    cookies = cookie_name + '=' + cookie_value + '; path=/;';
    if (expire_date != 0) cookies += 'expires=' + expire.toGMTString();
    document.cookie = cookies;
}

function getCookiem(name) {
    lims = document.cookie;
    var index = lims.indexOf(name + "=");
    if (index == -1) { return null; }
    index = lims.indexOf("=", index) + 1;
    var endstr = lims.indexOf(';', index);
    if (endstr == -1) { endstr = lims.length; }
    return unescape(lims.substring(index, endstr));
}
