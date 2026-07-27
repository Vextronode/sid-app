import api from "@/lib/api";


export function getCitizens(){

    return api.get("api/citizens");

}


export function getWilayah(){

    return api.get("api/citizens/wilayah");

}


export function deleteCitizen(id){

    return api.delete(
        `api/citizens/${id}`
    );

}