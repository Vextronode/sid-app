import api from "@/lib/api";


export function getKadusLetters(){

    return api.get(
        "api/kadus/letters"
    );

}