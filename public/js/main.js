document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('scrollTopButton');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
