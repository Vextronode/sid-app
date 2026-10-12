import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    getUsers,
    toggleUserStatus,
    updateUser as updateUserRequest,
} from "../api";


const ITEMS_PER_PAGE = 10;


export function useUserList(){

    const [users,setUsers] = useState([]);
    const [loading,setLoading] = useState(true);
    const [error,setError] = useState("");


    const [search,setSearch] = useState("");
    const [filterStatus,setFilterStatus] = useState("");
    const [currentPage,setCurrentPage] = useState(1);



    useEffect(()=>{

        loadUsers();

    },[]);



    async function loadUsers(){

        try{

            setLoading(true);
            setError("");

            const res = await getUsers();
            const userData =
                res.data?.data ??
                res.data?.users ??
                [];

            setUsers(
                Array.isArray(userData)
                ? userData
                : []
            );

        }catch(error){
            setError(error.response?.data?.message || "Gagal memuat data pengguna.");

        }finally{

            setLoading(false);

        }

    }





    const filtered = useMemo(()=>{


        let result=[...users];



        if(search){

            const keyword =
                search.toLowerCase();


            result =
            result.filter(user =>

                user.name
                ?.toLowerCase()
                .includes(keyword)

                ||

                user.email
                ?.toLowerCase()
                .includes(keyword)

            );

        }





        if(filterStatus){


            result =
            result.filter(user =>

                filterStatus === "aktif"
                ?
                user.is_active
                :
                !user.is_active

            );


        }



        return result;



    },[
        users,
        search,
        filterStatus
    ]);






    const totalPages = Math.max(
        1,
        Math.ceil(
            filtered.length / ITEMS_PER_PAGE
        )
    );





    const data = useMemo(()=>{


        const start =
        (currentPage-1)
        *
        ITEMS_PER_PAGE;



        return filtered.slice(
            start,
            start + ITEMS_PER_PAGE
        );


    },[
        filtered,
        currentPage
    ]);





    async function toggleStatus(id){
        try {
            setError("");
            await toggleUserStatus(id);
            await loadUsers();
        } catch (error) {
            const message = error?.response?.data?.message || "Gagal mengubah status pengguna.";
            setError(message);
            return false;
        }

    }

    async function updateUserName(id, name) {
        try {
            await updateUserRequest(id, { name });
            await loadUsers();
        } catch (error) {
            setError(error?.response?.data?.message || "Gagal memperbarui nama pengguna.");
            throw error;
        }
    }



    return {

        data,

        loading,
        error,


        setSearch,


        filterStatus,
        setFilterStatus,


        currentPage,
        setCurrentPage,


        totalPages,
        totalItems: filtered.length,


        toggleStatus,


        updateUser: updateUserName,

    };

}