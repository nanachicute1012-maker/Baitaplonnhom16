// Định nghĩa các đường dẫn riêng biệt cho từng loại dữ liệu
const ENDPOINTS = {
    // Link chứa Resource 'questions' (Mã ID 1)
    questions: "https://69fc3798fce564e259177a20.mockapi.io/api/v1/questions",
    
    // Link chứa Resource 'topics' và 'results' (Mã ID 2)
    topics: "https://69fc3796fce564e259177a0b.mockapi.io/api/v1/topics",
    results: "https://69fc3796fce564e259177a0b.mockapi.io/api/v1/results"
};

const API = {
    // Hàm lấy dữ liệu
    fetchData: async (resource, query = "") => {
        const url = `${ENDPOINTS[resource]}${query}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Không thể kết nối đến ${resource}`);
        return await response.json();
    },

    // Hàm tạo mới dữ liệu
    create: async (resource, data) => {
        const url = ENDPOINTS[resource];
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    },

    // Hàm xóa dữ liệu
    delete: async (resource, id) => {
        const url = `${ENDPOINTS[resource]}/${id}`;
        const response = await fetch(url, { method: 'DELETE' });
        return response.ok;
    }
};