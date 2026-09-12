"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const slider = document.querySelector(".hint-slider");
    const slides = document.querySelectorAll(".hint-slide");
    const dots = document.querySelectorAll(".hint-dots span");

    if (!slider || slides.length === 0) return;

    let currentSlide = 0;
    let autoSlide;
    let resumeTimer;
    let isUserScrolling = false;


    /* =========================================
       UPDATE DOTS
    ========================================= */

    function updateDots() {

        dots.forEach((dot, index) => {
            dot.classList.toggle(
                "active",
                index === currentSlide
            );
        });

    }


    /* =========================================
       GO TO SLIDE
    ========================================= */

    function goToSlide(index, smooth = true) {

        if (isUserScrolling) return;

        currentSlide = index;

        slider.scrollTo({
            left: slides[index].offsetLeft - (slider.clientWidth * 0.01),
            behavior: smooth ? "smooth" : "auto"
        });

        updateDots();

    }


    /* =========================================
       NEXT SLIDE
    ========================================= */

    function nextSlide() {

        if (isUserScrolling) return;

        if (currentSlide < slides.length - 1) {

            goToSlide(currentSlide + 1);

        } else {

            slider.style.scrollBehavior = "auto";

            currentSlide = 0;

            slider.scrollLeft =
                slides[0].offsetLeft -
                (slider.clientWidth * 0.01);

            updateDots();

            requestAnimationFrame(() => {
                slider.style.scrollBehavior = "smooth";
            });

        }

    }


    /* =========================================
       AUTO SLIDE
    ========================================= */

    function startAutoSlide() {

        clearInterval(autoSlide);

        autoSlide = setInterval(() => {

            if (!isUserScrolling) {
                nextSlide();
            }

        }, 5000);

    }


    /* =========================================
       USER SCROLL DETECTION
    ========================================= */

    slider.addEventListener("scroll", () => {

        isUserScrolling = true;

        clearInterval(autoSlide);
        clearTimeout(resumeTimer);


        /*
         * Work out which slide the user is currently viewing.
         */

        let closestSlide = 0;
        let closestDistance = Infinity;

        slides.forEach((slide, index) => {

            const target =
                slide.offsetLeft -
                (slider.clientWidth * 0.01);

            const distance =
                Math.abs(slider.scrollLeft - target);

            if (distance < closestDistance) {

                closestDistance = distance;
                closestSlide = index;

            }

        });


        currentSlide = closestSlide;

        updateDots();


        /*
         * User has stopped scrolling.
         * Give them 5 seconds before auto-slide resumes.
         */

        resumeTimer = setTimeout(() => {

            isUserScrolling = false;

            startAutoSlide();

        }, 5000);

    });


    /* =========================================
       DOT NAVIGATION
    ========================================= */

    dots.forEach((dot, index) => {

        dot.addEventListener("click", () => {

            clearTimeout(resumeTimer);
            clearInterval(autoSlide);

            isUserScrolling = false;

            goToSlide(index);

            startAutoSlide();

        });

    });


    /* =========================================
       START
    ========================================= */

    updateDots();
    startAutoSlide();

});