/* Thêm lựa chọn trong Luyện tập, không thay phiếu hiện có. */
document.addEventListener('mathapp:user-ready', async () => {
  const card = document.createElement('section');
  card.className = 'estimation-player est-entry';
  card.innerHTML = '<div class="est-card"><h2>Ước lượng trước khi tính đúng</h2><p>12 câu nhân và chia: ước lượng, tính chính xác rồi xem kết quả.</p><p data-entry-status role="status">Đang kiểm tra bài học…</p></div>';
  document.querySelector('main').prepend(card);
  async function load() {
    const status = card.querySelector('[data-entry-status]');
    try {
      const { lessons } = await window.MathAPI.get('/api/lessons');
      const lesson = lessons.find(l => l.questionSets.some(s => s.id === 'phieu-uoc-luong-v1'));
      status.textContent = '';
      if (!lesson) { status.textContent = 'Bộ bài chưa sẵn sàng. Em báo giáo viên kiểm tra nhé.'; return; }
      if (lesson.locked) { status.textContent = 'Em cần hoàn thành bài trước để mở bộ bài này.'; return; }
      const link = document.createElement('a');
      link.href = `lesson.html?lesson=${encodeURIComponent(lesson.id)}&set=phieu-uoc-luong-v1`;
      link.textContent = 'Vào bài ước lượng';
      status.append(link);
    } catch (error) {
      status.textContent = error.message + ' ';
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = 'Thử lại'; button.onclick = load; status.append(button);
    }
  }
  await load();
});
