import { apiClient, sharedGet } from "./client";

export const usersApi = {
  me: () => sharedGet("/users/me").then((r) => r.data),
  updateMe: (payload) => apiClient.put("/users/me", payload).then((r) => r.data),
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append("profile_image", file);
    return apiClient.post("/users/me/profile-image", formData).then((r) => r.data);
  },
  removeProfileImage: () => apiClient.delete("/users/me/profile-image"),
  changePassword: (payload) => apiClient.put("/users/me/password", payload).then((r) => r.data),
  // deletion_type: "scheduled" (default, 30-day grace period) | "instant" (immediate, irreversible)
  deleteMe: (deletion_type = "scheduled") => apiClient.delete("/users/me", { data: { deletion_type } }).then((r) => r.data),
  cancelDeletion: () => apiClient.post("/users/me/cancel-deletion").then((r) => r.data),
};
