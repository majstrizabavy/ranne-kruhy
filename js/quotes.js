import { quoteForDay } from './quotes-data.js';

const dialog = document.createElement('dialog');
dialog.id = 'quote-dialog';
dialog.className = 'quote-dialog';
dialog.setAttribute('aria-labelledby', 'quote-title');
dialog.innerHTML = `<header class="quote-header"><h2 id="quote-title">Citát na dnes</h2><button type="button" id="quote-close" aria-label="Zavrieť citát" autofocus>✕</button></header>
  <div class="quote-body"><span class="quote-mark" aria-hidden="true">“</span><figure class="quote-figure"><blockquote id="daily-quote"></blockquote><figcaption id="quote-author"></figcaption></figure></div>`;
document.body.append(dialog);
let opener = null;
let previousOverflow = '';
export function openQuote(button) {
  if (dialog.open) return;
  const quote = quoteForDay();
  dialog.querySelector('#daily-quote').textContent = quote.text;
  dialog.querySelector('#quote-author').textContent = quote.author;
  opener = button;
  previousOverflow = document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
dialog.querySelector('#quote-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
// Native Escape dismissal and the close button follow the same cleanup.
dialog.addEventListener('close', () => {
  document.body.style.overflow = previousOverflow;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
});
