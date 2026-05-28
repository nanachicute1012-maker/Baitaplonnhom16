function normalizeText(value) {
    if (!value) return "";
    try {
        return decodeURIComponent(escape(value));
    } catch (error) {
        return value;
    }
}

function demoImageForTopic(index) {
    const images = [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80"
    ];
    return images[index % images.length];
}

$(document).ready(function () {
    let currentQuestions = [];

    // 1. Load danh sách chủ đề
    async function init() {
        const topics = await API.fetchData("topics");
        const html = topics.map((t, index) => {
            const name = normalizeText(t.name || `Chủ đề ${index + 1}`);
            const description = normalizeText(t.description) || "Bộ câu hỏi được thiết kế để giúp bạn luyện tập nhanh và hiệu quả.";
            const image = /^(https?:)?\/\//i.test(String(t.image || ""))
                ? t.image
                : demoImageForTopic(index);

            return `
                <div class="col-lg-4 col-md-6 subject-item">
                    <article class="topic-card subject-card h-100">
                        <div class="subject-visual">
                            <img src="${image}" alt="${name}" />
                            <span class="subject-badge">Demo ${index + 1}</span>
                        </div>
                        <div class="subject-body">
                            <p class="eyebrow">Môn học</p>
                            <h5 class="topic-title">${name}</h5>
                            <p class="topic-desc">${description}</p>
                            <div class="subject-footer">
                                <span class="subject-pill">⚡ Bắt đầu ngay</span>
                                <button class="btn btn-primary topic-btn" onclick="startQuiz('${t.id}', '${name.replace(/'/g, "\\'")}')">Bắt đầu làm bài</button>
                            </div>
                        </div>
                    </article>
                </div>`;
        }).join('');

        $('#topic-list').html(html);
    }

    // 2. Bắt đầu làm bài
    window.startQuiz = async (topicId, topicName) => {
        const allQuestions = await API.fetchData("questions");
        currentQuestions = allQuestions.filter(q => q.topicId == topicId);

        if (currentQuestions.length === 0) return alert("Chủ đề này chưa có câu hỏi!");

        $('#topic-container').addClass('d-none');
        $('#quiz-section').removeClass('d-none');
        $('#quiz-title').text(topicName);

        const html = currentQuestions.map((q, i) => `
            <div class="mb-4 p-3 bg-white rounded border">
                <p class="fw-bold">Câu ${i+1}: ${q.content}</p>
                ${q.options.map((opt, idx) => `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="q${i}" value="${idx}" id="q${i}_${idx}">
                        <label class="form-check-label" for="q${i}_${idx}">${opt}</label>
                    </div>`).join('')}
            </div>`).join('');
        $('#question-container').html(html);
    };

    // 3. Nộp bài
    $('#btn-submit').click(async function () {
        let score = 0;
        currentQuestions.forEach((q, i) => {
            const selected = $(`input[name="q${i}"]:checked`).val();
            if (selected == q.correct_answer) score++;
        });

        const percent = Math.round((score / currentQuestions.length) * 100);
        $('#result-body').html(`<h3>Bạn đạt: ${percent}%</h3><p>Đúng ${score}/${currentQuestions.length} câu.</p>`);
        new bootstrap.Modal($('#resultModal')).show();

        // Lưu kết quả
        await API.create("results", {
            studentName: "Học sinh",
            topicId: currentQuestions[0].topicId,
            score: percent,
            date: new Date().toLocaleString('vi-VN')
        });
    });

    $('#historyButton').click(openHistory);

    init();
});

async function openHistory() {
    $('#history-loading').removeClass('d-none');
    $('#history-content').addClass('d-none');
    $('#history-empty').addClass('d-none');

    try {
        const [topics, results] = await Promise.all([
            API.fetchData('topics'),
            API.fetchData('results')
        ]);

        const topicMap = topics.reduce((map, topic) => {
            map[topic.id] = topic.name;
            return map;
        }, {});

        const sortedResults = results
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const rows = sortedResults.map(result => {
            return `<tr>
                        <td>${result.date}</td>
                        <td>${topicMap[result.topicId] || 'Không rõ'}</td>
                        <td><span class="badge bg-success">${result.score}%</span></td>
                    </tr>`;
        }).join('');

        $('#history-table-body').html(rows);
        if (rows.length === 0) {
            $('#history-empty').removeClass('d-none');
        }

        $('#history-loading').addClass('d-none');
        $('#history-content').removeClass('d-none');
        new bootstrap.Modal($('#historyModal')).show();
    } catch (error) {
        $('#history-loading').html(`<p class="text-danger">Không thể tải lịch sử. Vui lòng thử lại sau.</p>`);
        console.error(error);
    }
}

// Tìm kiếm môn học
$("#searchSubject").on("keyup", function () {
  const keyword = $(this).val().toLowerCase().trim();

  $(".subject-item").each(function () {
    const text = normalizeText($(this).text()).toLowerCase();
    const matches = text.includes(keyword);
    $(this).toggle(matches);
  });
});