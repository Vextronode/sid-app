import { useState } from "react";
import { loginSchema } from "../schemas/loginSchema";

export function useLoginForm() {
  const [formData, setFormData] = useState({ nik: "", password: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    // prsing data dari zod
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors = {};

      // map error dari Zod ke state error
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (!formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      });

      setErrors(formattedErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "nik" && value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e, onSuccess) => {
    e.preventDefault();
    if (validateForm()) {
      onSuccess(formData);
    }
  };

  return {
    formData,
    errors,
    handleChange,
    handleSubmit,
  };
}
