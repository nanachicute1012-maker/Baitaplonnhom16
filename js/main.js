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
        try {
            const topics = await API.fetchData("topics");
            const safeTopics = Array.isArray(topics) ? topics : [];

            if (safeTopics.length === 0) {
                $('#topic-list').html('<div class="col-12"><div class="alert alert-info mb-0">Hiện chưa có chủ đề nào để hiển thị. Vui lòng thử lại sau.</div></div>');
                return;
            }

            const html = safeTopics.map((t, index) => {
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
        } catch (error) {
            console.error('Lỗi khi tải chủ đề:', error);
            $('#topic-list').html('<div class="col-12"><div class="alert alert-warning mb-0">Không thể tải danh sách chủ đề lúc này. Vui lòng kiểm tra kết nối hoặc thử lại sau.</div></div>');
        }
    }

    function updateQuizProgress() {
        const answered = currentQuestions.filter((q, i) => $(`input[name="q${i}"]:checked`).length > 0).length;
        $('#quiz-progress').text(`${answered}/${currentQuestions.length} câu`);
    }

    // 2. Bắt đầu làm bài
    window.startQuiz = async (topicId, topicName) => {
        try {
            const allQuestions = await API.fetchData("questions");
            const safeQuestions = Array.isArray(allQuestions) ? allQuestions : [];
            currentQuestions = safeQuestions.filter(q => q.topicId == topicId);

            if (currentQuestions.length === 0) {
                alert("Chủ đề này chưa có câu hỏi!");
                return;
            }

            $(".hero").addClass("d-none");
            $("#topics .section-heading").addClass("d-none");
            $("#why").addClass("d-none"); // Ẩn lý do nên dùng khi làm bài
            $('#topic-container').addClass('d-none');
            $('#quiz-section').removeClass('d-none');
            $('#quiz-title').text(topicName);
            $('#btn-submit').text('Nộp bài ngay').prop('disabled', false);

            const html = currentQuestions.map((q, i) => `
                <article class="quiz-question-card">
                    <div class="quiz-question-meta">
                        <span class="quiz-question-number">Câu ${i + 1}</span>
                        <span class="quiz-question-level">${q.level || 'Trắc nghiệm'}</span>
                    </div>
                <h4 class="quiz-question-text">${q.content}</h4>
                <div class="quiz-options">
                    ${q.options.map((opt, idx) => `
                        <label class="quiz-option-card" for="q${i}_${idx}">
                            <input type="radio" name="q${i}" value="${idx}" id="q${i}_${idx}">
                            <span class="quiz-option-mark">${String.fromCharCode(65 + idx)}</span>
                            <span class="quiz-option-text">${opt}</span>
                        </label>`).join('')}
                </div>
            </article>`).join('');

            $('#question-container').html(html);
            updateQuizProgress();
        } catch (error) {
            console.error('Lỗi khi tải câu hỏi:', error);
            alert('Không thể tải câu hỏi lúc này. Vui lòng thử lại sau.');
        }
    };

    // Khi quay lại danh sách, hiện lại hero
    $('#btn-back-topics').click(function() {
        $(".hero").removeClass("d-none");
        $("#topics .section-heading").removeClass("d-none");
        $("#why").removeClass("d-none");
        $('#quiz-section').addClass('d-none');
        $('#topic-container').removeClass('d-none');
    });

    $('#question-container').on('change', 'input[type="radio"]', function () {
        $(this).closest('.quiz-option-card').addClass('selected');
        $(this).closest('.quiz-options').find('.quiz-option-card').not($(this).closest('.quiz-option-card')).removeClass('selected');
        updateQuizProgress();
    });

    // 3. Nộp bài
    $('#btn-submit').click(async function () {
        let score = 0;
        $(this).prop('disabled', true).text('Đã nộp bài');

        currentQuestions.forEach((q, i) => {
            const selected = $(`input[name="q${i}"]:checked`).val();
            const $questionCard = $('.quiz-question-card').eq(i);
            const $options = $questionCard.find('.quiz-option-card');

            $options.each(function (idx) {
                $(this).find('input').prop('disabled', true); // Vô hiệu hóa lựa chọn

                // Hiển thị đáp án đúng/sai
                if (idx == q.correct_answer) {
                    $(this).addClass('border-success bg-success-subtle shadow-sm');
                    $(this).append('<span class="ms-auto badge bg-success"><i class="bi bi-check-lg"></i> Đáp án đúng</span>');
                } else if (selected == idx) {
                    $(this).addClass('border-danger bg-danger-subtle');
                    $(this).append('<span class="ms-auto badge bg-danger"><i class="bi bi-x-lg"></i> Sai</span>');
                }
            });

            if (selected == q.correct_answer) score++;
        });

        const percent = Math.round((score / currentQuestions.length) * 100);
        $('#result-body').html(`
            <div class="py-3 text-center">
                <i class="bi bi-check-circle-fill text-success display-1"></i>
                <h3 class="mt-3">Bạn đạt: ${percent}%</h3>
                <p class="fs-5">Đúng ${score}/${currentQuestions.length} câu.</p>
                <p class="text-muted small">Cuộn xuống danh sách câu hỏi để xem chi tiết đáp án.</p>
            </div>
        `);
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