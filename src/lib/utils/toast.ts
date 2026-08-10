import {
  toast,
  ToastOptions,
  ToastContent,
  ToastContentProps,
  Id,
  UpdateOptions,
} from "react-toastify";

// Default toast configuration
const defaultConfig: ToastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
};

// Toast types with custom configurations
export const Toast = {
  success: (message: ToastContent, options?: ToastOptions): Id => {
    return toast.success(message, {
      ...defaultConfig,
      ...options,
      className: "toast-success",
    });
  },

  error: (message: ToastContent, options?: ToastOptions): Id => {
    return toast.error(message, {
      ...defaultConfig,
      autoClose: 5000,
      ...options,
      className: "toast-error",
    });
  },

  warning: (message: ToastContent, options?: ToastOptions): Id => {
    return toast.warning(message, {
      ...defaultConfig,
      ...options,
      className: "toast-warning",
    });
  },

  info: (message: ToastContent, options?: ToastOptions): Id => {
    return toast.info(message, {
      ...defaultConfig,
      ...options,
      className: "toast-info",
    });
  },

  loading: (message: ToastContent, options?: ToastOptions): Id => {
    return toast.loading(message, {
      ...defaultConfig,
      autoClose: false,
      closeButton: false,
      ...options,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: ToastOptions
  ): Promise<unknown> => {
    const normalizeOption = <X>(
      option?: string | ((value: X) => string)
    ): string | UpdateOptions<X> | undefined => {
      if (!option) {
        return undefined;
      }
      if (typeof option === "function") {
        return {
          render: (props: ToastContentProps<X>) =>
            option(props.data as X),
        };
      }
      return option;
    };

    const successOption = normalizeOption(messages.success);
    const errorOption = normalizeOption<any>(messages.error);

    return toast.promise(
      promise,
      {
        pending: messages.pending,
        success: successOption,
        error: errorOption,
      },
      {
        ...defaultConfig,
        ...options,
      }
    );
  },

  update: (
    toastId: Id,
    options: ToastOptions & { render?: ToastContent }
  ): void => {
    toast.update(toastId, options);
  },

  dismiss: (toastId?: Id): void => {
    toast.dismiss(toastId);
  },

  dismissAll: (): void => {
    toast.dismiss();
  },
};

// Custom toast configurations for specific use cases
export const ToastConfig = {
  product: {
    created: {
      position: "top-right" as const,
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    },
    updated: {
      position: "top-right" as const,
      autoClose: 3000,
    },
    deleted: {
      position: "top-right" as const,
      autoClose: 3000,
    },
  },
  order: {
    placed: {
      position: "top-center" as const,
      autoClose: 5000,
      hideProgressBar: false,
    },
    updated: {
      position: "top-right" as const,
      autoClose: 3000,
    },
  },
  upload: {
    progress: {
      position: "bottom-right" as const,
      autoClose: false,
      closeButton: false,
      hideProgressBar: false,
    },
    complete: {
      position: "bottom-right" as const,
      autoClose: 2000,
    },
  },
};
