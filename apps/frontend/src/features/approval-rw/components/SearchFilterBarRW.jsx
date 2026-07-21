/* eslint-disable no-unused-vars */

import { useState } from "react";
import { Search } from "lucide-react";

import { RELEVANT_STATUSES } from "../constants/roleConfigRW";
import { STATUS_BADGE } from "@/features/approval/constants/statusFlow";


export default function SearchFilterBarRW({
  onSearch,
  onFilterJenis,
  onFilterStatus,
  suratTypes = [],
  selectedStatus = "",
}) {

  const [keyword, setKeyword] = useState("");


  const handleSubmit = (e) => {
    e.preventDefault();

    onSearch(keyword);
  };


  return (

    <form
      onSubmit={handleSubmit}
      className="flex gap-3 mb-4"
    >


      {/* Search */}

      <input
        type="text"
        value={keyword}
        onChange={(e)=>setKeyword(e.target.value)}
        placeholder="Cari..."
        className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
      />



      <button
        type="submit"
        className="bg-green-600 text-white px-4 rounded-md flex items-center justify-center"
      >
        <Search size={16}/>
      </button>





      {/* Filter Jenis Surat */}

      <select
        onChange={(e)=>onFilterJenis(e.target.value)}
        className="border border-green-500 text-green-600 rounded-md px-3 text-sm"
      >

        <option value="">
          Semua Jenis
        </option>


        {
          suratTypes.map((type)=>(

            <option
              key={type.id}
              value={type.name}
            >
              {type.name}
            </option>

          ))
        }


      </select>





      {/* Filter Status */}

      <select
        value={selectedStatus}
        onChange={(e)=>onFilterStatus(e.target.value)}
        className="border border-green-500 text-green-600 rounded-md px-3 text-sm"
      >

        <option value="">
          Semua Status
        </option>


        {
          RELEVANT_STATUSES.map((status)=>(

            <option
              key={status}
              value={status}
            >

              {
                STATUS_BADGE[status]?.label
                ??
                status
              }

            </option>

          ))
        }


      </select>



    </form>

  );
}