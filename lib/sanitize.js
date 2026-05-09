const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML string (remove all tags, keep only text)
 * يستخدم لتنظيف محتوى HTML قبل إرساله للعميل أو تضمينه في وثيقة
 */
function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // نمنع أي وسوم HTML، فقط نص عادي
    ALLOWED_ATTR: []
  });
}

/**
 * Escape special characters for safe HTML text insertion
 * يستخدم لإدراج نص عادي داخل HTML (مثل innerHTML أو بناء السلاسل)
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safe text for JSON or JavaScript contexts (مثل إدراج داخل <script>)
 */
function safeText(text) {
  if (!text) return '';
  return String(text).replace(/[<>&'"]/g, function(c) {
    switch(c) {
      case '<': return '\\u003C';
      case '>': return '\\u003E';
      case '&': return '\\u0026';
      case "'": return '\\u0027';
      case '"': return '\\u0022';
      default: return c;
    }
  });
}

/**
 * Validate and sanitize numeric input
 */
function sanitizeNumeric(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Sanitize email address (basic)
 */
function sanitizeEmail(email) {
  if (!email) return '';
  const cleaned = String(email).trim().toLowerCase();
  // Basic email regex, remove any dangerous characters
  return cleaned.replace(/[<>'"]/g, '');
}

/**
 * Sanitize SQL input (especialy for dynamic LIKE clauses – though we use Supabase, this is extra)
 */
function sanitizeLikePattern(pattern) {
  if (!pattern) return '';
  return String(pattern).replace(/[%_]/g, '\\$&');
}

module.exports = {
  sanitizeHtml,
  escapeHtml,
  safeText,
  sanitizeNumeric,
  sanitizeEmail,
  sanitizeLikePattern
};
