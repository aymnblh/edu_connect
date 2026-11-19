document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('brochure-print-btn');
  if (button) {
    button.addEventListener('click', () => window.print());
  }
});
