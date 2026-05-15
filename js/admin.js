$(document).ready(function () {
    // 1. Tải danh sách chủ đề vào ô Chọn
    async function loadTopics() {
        const topics = await API.fetchData("topics");
        const html = topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        $('#selectTopic').html(html);
    }

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
                        <button class="btn btn-sm btn-danger" onclick="deleteQ('${q.id}')">Xóa</button>
                    </td>
                </tr>`;
        }).join('');
        $('#admin-question-list').html(html || '<tr><td colspan="4" class="text-center">Chưa có câu hỏi nào</td></tr>');
    }

    // 3. Xử lý lưu câu hỏi mới
    $('#form-add-question').submit(async function (e) {
        e.preventDefault();
        const data = {
            topicId: $('#selectTopic').val(),
            content: $('#content').val(),
            options: [$('#opt0').val(), $('#opt1').val(), $('#opt2').val(), $('#opt3').val()],
            correct_answer: parseInt($('#correct_answer').val()),
            level: "Thường"
        };

        if (await API.create("questions", data)) {
            alert("Đã lưu câu hỏi!");
            bootstrap.Modal.getInstance($('#addQuestionModal')).hide();
            this.reset();
            loadQuestions();
        }
    });

    window.deleteQ = async (id) => {
        if (confirm("Xóa câu hỏi này?")) {
            await API.delete("questions", id);
            loadQuestions();
        }
    };

    loadTopics();
    loadQuestions();
});