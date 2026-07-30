import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    getUsers,
    toggleUserStatus
} from "../api";


const ITEMS_PER_PAGE = 10;


export function useUserList(){

    const [users,setUsers] = useState([]);
    const [loading,setLoading] = useState(true);


    const [search,setSearch] = useState("");
    const [filterStatus,setFilterStatus] = useState("");
    const [currentPage,setCurrentPage] = useState(1);



    useEffect(()=>{

        loadUsers();

    },[]);



    async function loadUsers(){

        try{

            setLoading(true);


            const res = await getUsers();


           

            // aman untuk berbagai bentuk response
            const userData =
                res.data?.data ??
                res.data?.users ??
                res.data ??
                [];


            setUsers(
                Array.isArray(userData)
                ? userData
                : []
            );


        }catch(error){

            console.error(
                "GET USERS ERROR",
                error.response?.data ?? error
            );


            setUsers([]);

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

        await toggleUserStatus(id);

        loadUsers();

    }




    return {

        data,

        loading,


        setSearch,


        filterStatus,
        setFilterStatus,


        currentPage,
        setCurrentPage,


        totalPages,


        toggleStatus,


        addUser:()=>{},
        updateUser:()=>{}

    };

}