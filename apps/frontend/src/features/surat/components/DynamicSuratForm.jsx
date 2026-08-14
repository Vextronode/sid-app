import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";

import { LIST_SURAT_GLOBAL } from "@/lib/constants/suratList";

import { CheckCircle2, ChevronDown } from "lucide-react";

import { useSubmitSurat } from "../hooks/useSubmitSurat";
import { useLetterTypes } from "../hooks/useLetterTypes";

import { AutoFillProfile } from "./AutoFillProfile";
import { FileUploader } from "./FileUploader";


export function DynamicSuratForm({
  config,
  onCancel,
  onSubmit,
  initialData = {},
  onSubmitAPI = null,
}) {

  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialData);
  const [uploadedFiles, setUploadedFiles] = useState({});


  const {
    handleSubmit: submitSurat,
    loading
  } = useSubmitSurat();


  const letterTypes = useLetterTypes();



  const handleChange = (name,value)=>{

    setFormData(prev=>({
      ...prev,
      [name]:value
    }));

  };




  const handleFileChange = (e,name)=>{

    const files = Array.from(e.target.files);


    if(files.length){

      setUploadedFiles(prev=>{

        const newFiles=[
          ...(prev[name] || []),
          ...files
        ];


        handleChange(
          name,
          newFiles
        );


        return {
          ...prev,
          [name]:newFiles
        };

      });

    }

  };





  const handleRemoveFile = (
    e,
    name,
    index
  )=>{


    e.stopPropagation();


    setUploadedFiles(prev=>{


      const updated=[
        ...(prev[name] || [])
      ];


      updated.splice(index,1);



      if(updated.length===0){


        const copy={
          ...prev
        };


        delete copy[name];


        handleChange(
          name,
          null
        );


        return copy;

      }



      handleChange(
        name,
        updated
      );



      return {
        ...prev,
        [name]:updated
      };


    });


  };





const handleSubmit = async (e) => {
  e.preventDefault();

  if (!Array.isArray(letterTypes) || letterTypes.length === 0) {
    alert("Jenis surat masih dimuat.");
    return;
  }

  const selectedLetterType = letterTypes.find(
    (item) => item.code === config.code
  );

  if (!selectedLetterType) {
    alert("Jenis surat tidak ditemukan.");
    return;
  }

  const payload = new FormData();

  payload.append("letter_type_id", selectedLetterType.id);

  // purpose
  if (formData.keperluan) {
    payload.append("purpose", formData.keperluan);
  }

  // notes
  if (formData.catatan) {
    payload.append("notes", formData.catatan);
  }

  // attachments
  if (Array.isArray(formData.dokumen)) {
    formData.dokumen.forEach((file) => {
      payload.append("attachments[]", file);
    });
  }

  // Send all extra dynamic fields into payload[...]
  Object.keys(formData).forEach((key) => {
    if (!["keperluan", "catatan", "dokumen"].includes(key)) {
      const val = formData[key];
      if (val !== undefined && val !== null && !(val instanceof File) && !Array.isArray(val)) {
        payload.append(`payload[${key}]`, val);
      }
    }
  });

  try {
    let response;
    if (onSubmitAPI) {
      response = await onSubmitAPI(payload);
    } else {
      response = await submitSurat(payload);
    }

    onSubmit?.(response);
  } catch (error) {
    console.error(error);


    alert(
      error.response?.data?.message ??
      "Gagal mengirim surat."
    );
  }
};





  return (

<form
onSubmit={handleSubmit}
className="
bg-white
p-6
md:p-10
rounded-2xl
shadow-xl
w-full
border
border-gray-100
space-y-8
"
>



{/* PILIH SURAT */}

<div className="space-y-3 text-left">


<h3 className="
text-xs
font-extrabold
text-gray-500
tracking-wider
uppercase
">

Langkah 1 - Pilih Jenis Surat

</h3>




<div className="relative">


<label className="block text-xs font-semibold text-gray-500 mb-2">
  Jenis surat <span className="text-red-500">*</span>
</label>

<div className="relative">
  <select
    value={config.code}
    onChange={(e) => navigate(`/pengajuan-surat/${e.target.value}`)}
    className="
      w-full
      h-12
      pl-4
      pr-10
      border
      border-grren-700
      rounded-xl
      bg-white
      text-sm
      text-green-700
      appearance-none
      focus:outline-none
      focus:border-[#4CAF4F]
      focus:ring-2
      focus:ring-green-100
    "
  >
    {LIST_SURAT_GLOBAL.map((surat) => (
      <option key={surat.code} value={surat.code}>
        {surat.name}
      </option>
    ))}
  </select>

  <ChevronDown
    size={18}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none"
  />
</div>



</div>



<div className="
bg-[#E8F5E9]
border
border-[#A5D6A7]
text-[#2E7D32]
text-xs
px-4
py-2
rounded-full
inline-flex
items-center
gap-2
">


<CheckCircle2
className="
w-4
h-4
"
/>


Verifikasi:
<strong>
{config.type}
</strong>


</div>


</div>





{/* FORM */}


<div className="
space-y-5
text-left
">


<h3 className="
text-xs
font-extrabold
text-gray-500
uppercase
">

Langkah 2 - Isi Form

</h3>



<AutoFillProfile
user={user}
/>





<div className="
space-y-4
pt-4
border-t
">


{
config.fields.map(field=>(


<div
key={field.name}
>


<label className="
text-xs
font-semibold
text-gray-700
">

{field.label}


{
field.required &&
<span className="text-red-500">
*
</span>
}

</label>




{
field.type==="textarea" && (

<textarea
value={formData[field.name] || ""}
required={field.required}

placeholder={field.placeholder}

onChange={(e)=>
handleChange(
field.name,
e.target.value
)
}

className="
w-full
px-4
py-3
border
rounded-xl
"
/>

)

}




{
field.type==="text" && (

<input

type="text"
value={formData[field.name] || ""}
required={field.required}

placeholder={field.placeholder}

onChange={(e)=>
handleChange(
field.name,
e.target.value
)
}

className="
w-full
px-4
py-3
border
rounded-xl
"

/>

)

}





{
field.type==="file" && (

<FileUploader

field={field}

files={
uploadedFiles[field.name]
}

onFileChange={handleFileChange}

onRemoveFile={handleRemoveFile}

/>

)

}



{
field.type==="date" && (

<input

type="date"
value={formData[field.name] || ""}
required={field.required}

onChange={(e)=>
handleChange(
field.name,
e.target.value
)
}

className="
w-full
px-4
py-3
border
rounded-xl
"

/>

)

}



</div>


))
}



</div>


</div>





<div className="
flex
gap-4
pt-4
border-t
">


<button

type="button"

onClick={onCancel}

className="
flex-1
py-3
border
border-[#4CAF4F]
text-[#4CAF4F]
rounded-xl
"

>

Batal

</button>




<button

type="submit"

disabled={loading}

className="
flex-1
py-3
bg-[#4CAF4F]
text-white
rounded-xl
"

>

{
loading
?
"Mengirim..."
:
"Kirim"
}


</button>


</div>



</form>


  );

}