/* Player riêng cho type estimate; các type cũ tiếp tục dùng lesson.js. */
(function () {
  'use strict';
  const SET_ID = 'phieu-uoc-luong-v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const own = (map, key) => Object.prototype.hasOwnProperty.call(map, key);

  async function mount() {
    const root = document.getElementById('questions-container');
    root.classList.add('estimation-player');
    document.getElementById('btn-submit-lesson').hidden = true;
    document.getElementById('btn-submit-lesson').style.display = 'none';
    document.getElementById('set-kind').textContent = 'Luyện tập nhân và chia • 12 câu';
    document.getElementById('lesson-title').textContent = 'Ước lượng trước khi tính đúng';
    document.getElementById('lesson-desc').textContent = 'Mỗi câu: ước lượng trước, tính chính xác sau. Hai phần có trọng số bằng nhau.';
    const key = `estimation:last-run:${window.MathApp.user.id}:${SET_ID}`;
    let run = null, currentId = null, view = 'intro', busy = false, dirty = false;
    const stored = () => { try { return localStorage.getItem(key); } catch { return null; } };
    const remember = id => { try { localStorage.setItem(key, id); } catch { /* URL still restores this run. */ } };
    const urlRun = id => {
      const url = new URL(location.href);
      if (id) url.searchParams.set('runId', id); else url.searchParams.delete('runId');
      history.replaceState(null, '', url);
    };
    const resumeView = () => {
      currentId = run.nextQuestionId;
      view = run.status === 'submitted' ? 'result' : run.readyToSubmit ? 'review' : 'question';
    };
    const focus = () => (root.querySelector('input') || root.querySelector('h2'))?.focus();
    const setBusy = value => {
      busy = value;
      root.setAttribute('aria-busy', String(value));
      root.querySelectorAll('button').forEach(b => { if (value) { b.dataset.wasDisabled = String(b.disabled); b.disabled = true; }
        else if (b.dataset.wasDisabled !== undefined) { b.disabled = b.dataset.wasDisabled === 'true'; delete b.dataset.wasDisabled; } });
      root.querySelectorAll('input').forEach(input => { input.readOnly = value; });
    };
    const error = message => {
      root.querySelector('[data-error]').textContent = message;
      const input = root.querySelector('input');
      if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    };
    async function action(fn) {
      if (busy) return;
      setBusy(true);
      root.querySelector('[data-error]').textContent = '';
      try { await fn(); }
      catch (err) { error(`Chưa xác nhận lưu. ${err.message}`); }
      finally { setBusy(false); }
    }
    function render() {
      dirty = false;
      const count = run ? Object.keys(run.draftAnswers).length : 0;
      document.getElementById('lesson-progress').style.width = `${Math.round(count / 12 * 100)}%`;
      document.getElementById('lesson-progress-text').textContent = `Đã lưu ${count}/12 câu`;
      let content = '';
      if (view === 'intro') {
        content = `<h2 tabindex="-1">Cùng thử ước lượng nhé!</h2>
          <p>Em có thể làm tròn số để nhẩm một kết quả gần đúng. Sau khi xác nhận, ước lượng sẽ được giữ nguyên.</p>
          <p>Tiếp theo, em tính chính xác rồi lưu để sang câu mới. Chỉ khi nộp đủ 12 câu, em mới xem điểm và đáp án.</p>
          <button type="button" data-start>Bắt đầu lượt mới</button>`;
      } else if (view === 'question') {
        const index = run.questions.findIndex(q => q.id === currentId);
        const q = run.questions[index];
        const confirmed = run.confirmedEstimates[q.id];
        const saved = own(run.draftAnswers, q.id);
        content = `<h2 tabindex="-1">Câu ${index + 1}/12: ${esc(q.prompt)}</h2>
          <p>${confirmed ? 'Bước 2: Tính chính xác' : 'Bước 1: Ước lượng'}</p>
          ${confirmed ? `<p>Ước lượng đã khóa: <strong>${esc(confirmed.value)}</strong></p>` : '<p>Em hãy nhập một số gần với kết quả của phép tính.</p>'}
          <form novalidate>
            <label for="est-value">${confirmed ? 'Kết quả em tính chính xác' : 'Ước lượng của em'}</label>
            <input id="est-value" name="${confirmed ? 'answer' : 'estimate'}" type="text" inputmode="numeric" autocomplete="off"
              aria-describedby="est-help est-save-state est-error" value="${saved ? esc(run.draftAnswers[q.id]) : ''}">
            <p id="est-help">Chỉ nhập chữ số. Nội dung đang gõ chưa được tự lưu.</p>
            <p id="est-save-state" role="status">${saved ? 'Đã lưu' : 'Chưa lưu'}</p>
            <button type="submit">${!confirmed ? 'Xác nhận ước lượng' : saved ? 'Lưu thay đổi' : index === 11 ? 'Lưu và xem lại' : 'Câu tiếp theo'}</button>
          </form>
          <nav aria-label="Các câu đã làm">${run.questions.map((item, i) =>
            own(run.draftAnswers, item.id) || item.id === run.nextQuestionId
              ? `<button type="button" class="est-secondary" data-question="${esc(item.id)}" ${item.id === q.id ? 'aria-current="step" disabled' : ''}>Câu ${i + 1}</button>` : '').join('')}
            ${run.readyToSubmit ? '<button type="button" class="est-secondary" data-review>Xem lại cả bộ</button>' : ''}
          </nav>`;
      } else if (view === 'review') {
        content = `<h2 tabindex="-1">Xem lại trước khi nộp</h2>
          <p>Cả 12 câu đã được lưu. Em có thể sửa kết quả tính chính xác; ước lượng đã khóa được giữ nguyên.</p>
          <ol>${run.questions.map((q, i) => `<li><strong>${esc(q.prompt)}</strong>
            <p>Ước lượng: ${esc(run.confirmedEstimates[q.id].value)} · Kết quả em tính: ${esc(run.draftAnswers[q.id])}</p>
            <button type="button" class="est-secondary" data-question="${esc(q.id)}">Sửa kết quả câu ${i + 1}</button></li>`).join('')}</ol>
          <button type="button" data-submit>Nộp bài</button>`;
      } else {
        const r = run.result;
        content = `<h2 tabindex="-1">Kết quả đã lưu: ${r.scorePercent}/100</h2>
          <p>${r.correctCount}/${r.totalCount} câu đạt trọn điểm. Nhận thêm ${r.starsEarned} sao.</p>
          <p>Mỗi câu gồm 50% điểm ước lượng và 50% điểm tính chính xác.</p>
          <ol>${r.detail.map(d => `<li><strong>${esc(d.prompt)}</strong>
            <p>Ước lượng của em: ${esc(d.estimate)} — ${esc(d.estimateFeedback)} (${d.estimateScore}/10).</p>
            <p>Kết quả em tính: ${esc(d.answer)} — ${esc(d.exactFeedback)} (${d.exactScore}/10).</p>
            <p>Đáp án đúng: ${esc(d.correctAnswer)} · Điểm câu: ${d.score}/10.</p></li>`).join('')}</ol>
          <button type="button" data-start>Làm lượt mới</button>`;
      }
      root.innerHTML = `<section class="est-card">${content}
        <p id="est-error" data-error role="alert" aria-live="assertive"></p>
        ${run ? '<button type="button" class="est-secondary" data-reload>Tải lại bản đã lưu</button>' : ''}
        ${run && view !== 'result' ? '<button type="button" class="est-secondary" data-start>Làm lượt mới</button><p>Lượt hiện tại vẫn được lưu khi em bắt đầu lượt mới.</p>' : ''}
        <dialog aria-labelledby="est-unsaved-title"><h2 id="est-unsaved-title">Em đang có thay đổi chưa lưu</h2>
          <p>Em muốn lưu trước khi chuyển hay bỏ thay đổi đang gõ?</p>
          <button type="button" data-save-leave>Lưu và chuyển</button>
          <button type="button" class="est-secondary" data-discard>Bỏ thay đổi</button>
          <button type="button" class="est-secondary" data-stay>Ở lại</button></dialog>
      </section>`;
      root.querySelector('[data-start]')?.addEventListener('click', () => leave(async () => {
        run = await window.MathAPI.post('/api/estimation-runs', { setId: SET_ID });
        remember(run.runId); urlRun(run.runId); resumeView(); render();
      }));
      root.querySelector('input')?.addEventListener('input', event => {
        const base = run.draftAnswers[currentId] ?? '';
        dirty = event.target.value !== base;
        event.target.removeAttribute('aria-invalid');
        root.querySelector('#est-save-state').textContent = dirty ? 'Chưa lưu' : own(run.draftAnswers, currentId) ? 'Đã lưu' : 'Chưa lưu';
      });
      root.querySelector('form')?.addEventListener('submit', event => {
        event.preventDefault();
        action(async () => {
          const wasSaved = own(run.draftAnswers, currentId);
          const wasConfirmed = own(run.confirmedEstimates, currentId);
          await saveCurrent();
          if (wasConfirmed && !wasSaved) resumeView();
          render();
        });
      });
      root.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => leave(async () => {
        currentId = button.dataset.question; view = 'question'; render();
      })));
      root.querySelector('[data-review]')?.addEventListener('click', () => leave(async () => { view = 'review'; render(); }));
      root.querySelector('[data-reload]')?.addEventListener('click', () => leave(async () => {
        run = await window.MathAPI.get(`/api/estimation-runs/${encodeURIComponent(run.runId)}`);
        resumeView(); render();
      }));
      root.querySelector('[data-submit]')?.addEventListener('click', () => action(async () => {
        const result = await window.MathAPI.post('/api/submissions', { setId: SET_ID, runId: run.runId, answers: run.draftAnswers });
        run.status = 'submitted'; run.result = result; view = 'result'; render();
      }));
      focus();
    }
    async function saveCurrent() {
      const value = root.querySelector('input').value;
      const base = `/api/estimation-runs/${encodeURIComponent(run.runId)}`;
      if (own(run.confirmedEstimates, currentId)) {
        run = await window.MathAPI.put(`${base}/answers/${encodeURIComponent(currentId)}`, { answer: value });
      } else {
        run = await window.MathAPI.post(`${base}/estimates/${encodeURIComponent(currentId)}`, { estimate: value });
      }
      dirty = false;
    }
    function leave(next) {
      if (busy) return;
      if (!dirty) return action(next);
      const dialog = root.querySelector('dialog');
      dialog.querySelector('[data-stay]').onclick = () => dialog.close();
      dialog.querySelector('[data-discard]').onclick = () => { dialog.close(); dirty = false; action(next); };
      dialog.querySelector('[data-save-leave]').onclick = () => { dialog.close(); action(async () => { await saveCurrent(); await next(); }); };
      dialog.showModal();
    }
    window.addEventListener('beforeunload', event => {
      if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
    });
    const runId = new URLSearchParams(location.search).get('runId') || stored();
    render();
    if (runId) await action(async () => {
      run = await window.MathAPI.get(`/api/estimation-runs/${encodeURIComponent(runId)}`);
      remember(run.runId); urlRun(run.runId); resumeView(); render();
    });
  }
  window.EstimationPlayer = { setId: SET_ID, mount };
})();
