import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  withCredentials: true,
  withXSRFToken: true,
});


// ======================================================
// GET LIST SURAT
// ======================================================
export function getSuratList(role) {

  switch (role) {

    case "rt":
      return api.get("/rt/letters");


    case "rw":
      return api.get("/rw/letters");


    case "kadus":
      return api.get("/kadus/letters");

    case "kasi":
      return api.get("/kasi/letters");

    default:
      return api.get("/letters");

  }

}



// ======================================================
// GET DETAIL SURAT
// ======================================================
export function getSuratDetail(
  id,
  role = "rt"
) {

  switch (role) {

    case "rt":
      return api.get(`/rt/letters/${id}`);


    case "rw":
      return api.get(`/rw/letters/${id}`);


    case "kadus":
      return api.get(`/kadus/letters/${id}`);

    case "kasi":
      return api.get(`/kasi/letters/${id}`);

    default:
      return api.get(`/letters/${id}`);

  }

}



// ======================================================
// RT / Kadus
// Endpoint : /decision
// ======================================================
export function submitDecision(
  role,
  id,
  status,
  notes = null
) {

  return api.patch(
    `/${role}/letters/${id}/decision`,
    {
      status,
      notes,
    }
  );

}



// ======================================================
// RW / Kasi
// Endpoint : /approve
// ======================================================
export function approveSurat(
  role,
  id,
  status,
  notes = null
) {

  return api.patch(
    `/${role}/approvals/${id}/approve`,
    {
      status,
      notes,
    }
  );

}



export default api;