async function loadDashboardStats() {
    try {
        const [questions, topics, results] = await Promise.all([
            API.fetchData("questions"),
            API.fetchData("topics"),
            API.fetchData("results")
        ]);

        const totalQuestions = Array.isArray(questions) ? questions.length : 0;
        const totalTopics = Array.isArray(topics) ? topics.length : 0;
        const totalAttempts = Array.isArray(results) ? results.length : 0;
        const averageScore = totalAttempts > 0
            ? results.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / totalAttempts
            : 0;

        $('#stat-questions').text(totalQuestions);
        $('#stat-attempts').text(totalAttempts);
        $('#stat-score').text(`${averageScore.toFixed(1)}%`);
        $('#stat-topics').text(totalTopics);
    } catch (error) {
        console.error('Lỗi khi tải thống kê:', error);
    }
}

$(document).ready(function () {
    // Cấu hình giao diện Sáng/Tối cho Admin
    const themeToggleAdmin = document.getElementById("themeToggleAdmin");
    const savedTheme = localStorage.getItem("spark-theme") || "dark";

    const applyAdminTheme = (theme) => {
        document.body.dataset.theme = theme;
        if (themeToggleAdmin) {
            themeToggleAdmin.innerHTML = theme === "dark" 
                ? '<i class="bi bi-moon-fill"></i> Tối' 
                : '<i class="bi bi-sun-fill"></i> Sáng';
        }
    };

    applyAdminTheme(savedTheme);

    let editingQuestionId = null;

    // 1. Tải danh sách chủ đề vào ô Chọn
    async function loadTopics() {
        const topics = await API.fetchData("topics");
        const html = topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        $('#selectTopic').html(html);
    }

    function resetFormState() {
        editingQuestionId = null;
        $('#form-add-question')[0].reset();
        $('#question_level').val('Dễ');
        $('#addQuestionModal .modal-title').text('Thêm câu hỏi mới');
        $('#form-add-question button[type="submit"]').text('Lưu câu hỏi');
    }

    // Sự kiện nút đổi theme Admin
    $('#themeToggleAdmin').click(function() {
        const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem("spark-theme", nextTheme);
        applyAdminTheme(nextTheme);
    });

    // 2. Hiển thị danh sách câu hỏi
    async function loadQuestions() {
        const questions = await API.fetchData("questions");
        const topics = await API.fetchData("topics");
        
        let html = questions.reverse().map(q => {
            const topic = topics.find(t => t.id == q.topicId);
            return `
                <tr>
                    <td class="ps-4"><b>${q.content}</b></td>
                    <td><span class="badge bg-info text-dark">${topic ? topic.name : 'N/A'}</span></td>
                    <td>${q.level || 'Dễ'}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-outline-warning btn-sm admin-action-btn me-2" onclick="editQ('${q.id}')" title="Sửa câu hỏi">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm admin-action-btn" onclick="deleteQ('${q.id}')" title="Xóa câu hỏi">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');
        $('#admin-question-list').html(html || '<tr><td colspan="4" class="text-center">Chưa có câu hỏi nào</td></tr>');
    }

    // 3. Xử lý lưu câu hỏi mới hoặc cập nhật câu hỏi
    $('#form-add-question').submit(async function (e) {
        e.preventDefault();
        const data = {
            topicId: $('#selectTopic').val(),
            content: $('#content').val(),
            options: [$('#opt0').val(), $('#opt1').val(), $('#opt2').val(), $('#opt3').val()],
            correct_answer: parseInt($('#correct_answer').val()),
            level: $('#question_level').val() || "Dễ"
        };

        if (editingQuestionId) {
            if (await API.update("questions", editingQuestionId, data)) {
                alert("Đã cập nhật câu hỏi!");
                bootstrap.Modal.getInstance($('#addQuestionModal')).hide();
                resetFormState();
                await loadQuestions();
                await loadDashboardStats();
            }
            return;
        }

        if (await API.create("questions", data)) {
            alert("Đã lưu câu hỏi!");
            bootstrap.Modal.getInstance($('#addQuestionModal')).hide();
            resetFormState();
            await loadQuestions();
            await loadDashboardStats();
        }
    });

    window.editQ = async (id) => {
        const question = await API.fetchData('questions', `/${id}`);
        if (!question) return;

        editingQuestionId = id;
        $('#selectTopic').val(question.topicId);
        $('#content').val(question.content);
        $('#opt0').val(question.options?.[0] || '');
        $('#opt1').val(question.options?.[1] || '');
        $('#opt2').val(question.options?.[2] || '');
        $('#opt3').val(question.options?.[3] || '');
        $('#question_level').val(question.level || 'Dễ');
        $('#correct_answer').val(question.correct_answer ?? 0);
        $('#addQuestionModal .modal-title').text('Sửa câu hỏi');
        $('#form-add-question button[type="submit"]').text('Cập nhật');

        new bootstrap.Modal($('#addQuestionModal')).show();
    };

    window.deleteQ = async (id) => {
        if (confirm("Xóa câu hỏi này?")) {
            await API.delete("questions", id);
            await loadQuestions();
            await loadDashboardStats();
        }
    };

    $('#addQuestionModal').on('hidden.bs.modal', resetFormState);

    loadTopics();
    loadQuestions();
    loadDashboardStats();
});

// Hàm tải lịch sử làm bài
async function loadResults() {
    try {
        // 1. Lấy dữ liệu từ API results và topics
        const results = await API.fetchData("results");
        const topics = await API.fetchData("topics");

        if (!results || results.length === 0) {
            $('#admin-result-list').html('<tr><td colspan="5" class="text-center py-4">Chưa có ai làm bài thi nào.</td></tr>');
            return;
        }

        // 2. Render danh sách ra bảng (Đảo ngược để cái mới nhất hiện lên đầu)
        let html = results.reverse().map(res => {
            // Tìm tên chủ đề dựa vào topicId
            const topic = topics.find(t => t.id == res.topicId);
            
            return `
                <tr>
                    <td class="ps-4 fw-bold text-dark">${res.studentName || "Ẩn danh"}</td>
                    <td><span class="badge bg-secondary">${topic ? topic.name : 'N/A'}</span></td>
                    <td>
                        <span class="fw-bold ${res.score >= 50 ? 'text-success' : 'text-danger'}">
                            ${res.score}%
                        </span>
                    </td>
                    <td class="text-muted small">${res.date}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteResult('${res.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        $('#admin-result-list').html(html);
        await loadDashboardStats();
    } catch (error) {
        console.error("Lỗi khi tải lịch sử:", error);
    }
}

// Hàm xóa lịch sử
window.deleteResult = async (id) => {
    if (confirm("Bạn có chắc muốn xóa dòng lịch sử này không?")) {
        await API.delete("results", id);
        await loadResults();
    }
};
$(document).ready(function() {
    loadResults(); // Tải lịch sử làm bài khi trang admin được mở
});