import api from "@/lib/api";

export function getUsers(){

    return api.get("/api/users");

}



export function toggleUserStatus(id){

    return api.patch(`/api/users/${id}/toggle-status`);

}

export function updateUser(id, payload) {
    return api.patch(`/api/users/${id}`, payload);
}