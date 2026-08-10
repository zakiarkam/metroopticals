"use client";
import { ToastContainer as ReactToastifyContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const ToastContainer = () => {
  return (
    <ReactToastifyContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      limit={3}
      style={{
        zIndex: 99999,
      }}
    />
  );
};
