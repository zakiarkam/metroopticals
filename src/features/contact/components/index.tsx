"use client";

import { FormEvent, useState } from "react";
import Breadcrumb from "@/components/common/Breadcrumb";
import SiteContainer from "@/components/common/SiteContainer";
import { contactApi } from "@/features/contact/api/contact-api";
import { siteConfig } from "@/config/site";

type FormStatus = {
  type: "success" | "error";
  message: string;
} | null;

const Contact = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();
    const emailTrimmed = email.trim();
    const messageTrimmed = message.trim();

    if (
      !firstNameTrimmed ||
      !lastNameTrimmed ||
      !emailTrimmed ||
      !messageTrimmed
    ) {
      setStatus({
        type: "error",
        message: "Name, email, and message are required fields.",
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: `${firstNameTrimmed} ${lastNameTrimmed}`,
      email: emailTrimmed,
      phone: phone.trim() || undefined,
      subject: subject.trim() || undefined,
      message: messageTrimmed,
    };

    try {
      const response = await contactApi.submitContact(payload);

      setStatus({
        type: "success",
        message:
          response.message ??
          "Your message has been sent. We'll be in touch soon!",
      });

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send your message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="overflow-hidden py-8 bg-gradient-to-b from-gray-50 to-gray-100">
        <SiteContainer>
          <div className="flex flex-col xl:flex-row gap-5">
            <div className="xl:flex-[0.32] w-full  bg-gradient-to-br from-gray-2 to-gray-50 rounded-2xl shadow-lg border border-gray-200">
              <div className="py-4 px-5 sm:px-6 border-b rounded-t-2xl border-gray-200 bg-gradient-to-r from-blue-light-5 to-blue-light-4">
                <p className="font-bold text-xl text-dark flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Contact Information
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-3.5">
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-light-5 transition-colors duration-200 group"
                    aria-label={`Email ${siteConfig.contact.email}`}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M9.11365 2.97913H12.8837C14.5684 2.97911 15.9027 2.9791 16.947 3.1195C18.0217 3.26399 18.8916 3.56843 19.5776 4.25443C20.2636 4.94043 20.568 5.8103 20.7125 6.88502C20.8529 7.9293 20.8529 9.26363 20.8529 10.9482V11.0517C20.8529 12.7363 20.8529 14.0706 20.7125 15.1149C20.568 16.1896 20.2636 17.0595 19.5776 17.7455C18.8916 18.4315 18.0217 18.7359 16.947 18.8804C15.9027 19.0208 14.5684 19.0208 12.8837 19.0208H9.11366C7.42904 19.0208 6.09471 19.0208 5.05043 18.8804C3.97571 18.7359 3.10584 18.4315 2.41984 17.7455C1.73384 17.0595 1.4294 16.1896 1.28491 15.1149C1.14451 14.0706 1.14452 12.7363 1.14453 11.0517V10.9482C1.14452 9.26363 1.14451 7.9293 1.28491 6.88502C1.4294 5.8103 1.73384 4.94043 2.41984 4.25443C3.10584 3.56843 3.97571 3.26399 5.05043 3.1195C6.09471 2.9791 7.42904 2.97911 9.11365 2.97913ZM5.23364 4.48224C4.31139 4.60623 3.78005 4.83876 3.39211 5.2267C3.00417 5.61465 2.77164 6.14599 2.64764 7.06824C2.52099 8.01026 2.51953 9.25204 2.51953 11C2.51953 12.7479 2.52099 13.9897 2.64764 14.9317C2.77164 15.8539 3.00417 16.3853 3.39211 16.7732C3.78005 17.1612 4.31139 17.3937 5.23364 17.5177C6.17567 17.6443 7.41745 17.6458 9.16536 17.6458H12.832C14.58 17.6458 15.8217 17.6443 16.7638 17.5177C17.686 17.3937 18.2173 17.1612 18.6053 16.7732C18.9932 16.3853 19.2258 15.8539 19.3498 14.9317C19.4764 13.9897 19.4779 12.7479 19.4779 11C19.4779 9.25204 19.4764 8.01026 19.3498 7.06824C19.2258 6.14599 18.9932 5.61465 18.6053 5.2267C18.2173 4.83876 17.686 4.60623 16.7638 4.48224C15.8217 4.35559 14.58 4.35413 12.832 4.35413H9.16537C7.41745 4.35413 6.17567 4.35559 5.23364 4.48224ZM4.97055 6.89317C5.21362 6.60148 5.64713 6.56207 5.93883 6.80514L7.91781 8.4543C8.77303 9.16697 9.36678 9.66017 9.86807 9.98258C10.3533 10.2947 10.6824 10.3994 10.9987 10.3994C11.315 10.3994 11.6441 10.2947 12.1293 9.98258C12.6306 9.66017 13.2244 9.16697 14.0796 8.4543L16.0586 6.80514C16.3503 6.56207 16.7838 6.60148 17.0269 6.89317C17.2699 7.18486 17.2305 7.61837 16.9388 7.86145L14.9254 9.53932C14.1129 10.2164 13.4543 10.7652 12.8731 11.139C12.2677 11.5284 11.678 11.7744 10.9987 11.7744C10.3194 11.7744 9.72973 11.5284 9.12428 11.139C8.54306 10.7652 7.88452 10.2164 7.07203 9.53933L5.05857 7.86145C4.76688 7.61837 4.72747 7.18486 4.97055 6.89317Z"
                        fill="#C09C6C"
                      />
                    </svg>
                    Email: {siteConfig.contact.email}
                  </a>

                  <a
                    href={siteConfig.contact.phoneHref}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-light-5 transition-colors duration-200 group"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.1559 1.72346C12.2166 1.34865 12.571 1.09439 12.9458 1.15507C12.969 1.15951 13.0436 1.17346 13.0827 1.18217C13.161 1.19959 13.2701 1.22641 13.4061 1.26604C13.6781 1.34528 14.0582 1.47581 14.5143 1.68494C15.4276 2.10363 16.6429 2.83605 17.9041 4.0972C19.1652 5.35835 19.8977 6.57368 20.3163 7.48693C20.5255 7.94308 20.656 8.32314 20.7352 8.59518C20.7749 8.73122 20.8017 8.84033 20.8191 8.91855C20.8278 8.95766 20.8342 8.98907 20.8386 9.01227L20.8439 9.04086C20.9046 9.41568 20.6526 9.78465 20.2778 9.84533C19.9041 9.90584 19.552 9.65281 19.4898 9.27975C19.4879 9.26974 19.4826 9.24283 19.477 9.21745C19.4657 9.16668 19.4461 9.08617 19.4151 8.9797C19.3531 8.76672 19.2453 8.45017 19.0664 8.05997C18.7091 7.28052 18.0665 6.20418 16.9318 5.06947C15.7971 3.93477 14.7208 3.29219 13.9413 2.93484C13.5511 2.75595 13.2346 2.64821 13.0216 2.58618C12.9151 2.55516 12.7813 2.52445 12.7305 2.51314C12.3575 2.45097 12.0954 2.09721 12.1559 1.72346Z"
                        fill="#C09C6C"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.3633 4.88547C12.4677 4.52039 12.8482 4.30899 13.2133 4.4133L13.0244 5.07434C13.2133 4.4133 13.2133 4.4133 13.2133 4.4133L13.2146 4.41368L13.216 4.41408L13.219 4.41497L13.2261 4.41709L13.2443 4.42275C13.2581 4.42716 13.2754 4.43292 13.2959 4.44022C13.3371 4.45483 13.3915 4.47561 13.4583 4.50421C13.5918 4.56144 13.7743 4.64983 13.9984 4.78248C14.4471 5.04802 15.0596 5.4891 15.7792 6.20866C16.4987 6.92822 16.9398 7.54072 17.2053 7.9894C17.338 8.21353 17.4264 8.39601 17.4836 8.52955C17.5122 8.59629 17.533 8.65071 17.5476 8.69187C17.5549 8.71245 17.5607 8.72971 17.5651 8.74354L17.5707 8.76167L17.5728 8.76878L17.5737 8.77184L17.5741 8.77324C17.5741 8.77324 17.5745 8.77456 16.9135 8.96343L17.5745 8.77456C17.6788 9.13965 17.4674 9.52017 17.1023 9.62448C16.7404 9.7279 16.3632 9.52096 16.2551 9.16157L16.2518 9.15169C16.2469 9.13791 16.2368 9.1108 16.2198 9.07119C16.1859 8.99205 16.1244 8.86259 16.022 8.68971C15.8177 8.34437 15.4485 7.82256 14.8069 7.18093C14.1653 6.53931 13.6435 6.17016 13.2981 5.96577C13.1252 5.86346 12.9958 5.80195 12.9166 5.76804C12.877 5.75106 12.8499 5.74095 12.8361 5.73606L12.8263 5.73267C12.4669 5.62462 12.2599 5.24746 12.3633 4.88547Z"
                        fill="#C09C6C"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.59146 4.03966C6.13153 2.4996 8.73041 2.61667 9.80274 4.53812L10.3977 5.60414C11.0979 6.85889 10.7995 8.44205 9.77441 9.47969C9.76075 9.49839 9.6884 9.60375 9.67938 9.78783C9.66788 10.0228 9.75133 10.5662 10.5932 11.4081C11.4348 12.2497 11.9781 12.3333 12.2132 12.3219C12.3974 12.3129 12.5029 12.2405 12.5216 12.2269C13.5592 11.2018 15.1424 10.9034 16.3971 11.6036L17.4632 12.1985C19.3846 13.2709 19.5017 15.8698 17.9616 17.4098C17.1378 18.2336 16.0425 18.9655 14.7553 19.0143C12.8478 19.0867 9.6805 18.594 6.54387 15.4574C3.40724 12.3208 2.91463 9.15348 2.98694 7.24596C3.03574 5.95877 3.76769 4.86343 4.59146 4.03966ZM8.60206 5.2082C8.05297 4.2243 6.57741 3.99826 5.56374 5.01193C4.853 5.72267 4.39094 6.50717 4.36096 7.29804C4.30065 8.88877 4.69339 11.6624 7.51614 14.4851C10.3389 17.3079 13.1125 17.7006 14.7032 17.6403C15.4941 17.6103 16.2786 17.1483 16.9893 16.4375C18.003 15.4239 17.777 13.9483 16.7931 13.3992L15.7271 12.8043C15.0639 12.4342 14.1325 12.5604 13.4786 13.2143C13.4144 13.2785 13.0055 13.66 12.28 13.6953C11.5373 13.7314 10.6383 13.3977 9.62095 12.3803C8.60326 11.3626 8.26966 10.4634 8.30603 9.72058C8.34155 8.99503 8.72309 8.58656 8.78693 8.52271C9.4408 7.86884 9.56708 6.93735 9.19699 6.27422L8.60206 5.2082Z"
                        fill="#C09C6C"
                      />
                    </svg>
                    Phone: {siteConfig.contact.phone}
                  </a>

                  <div className="flex gap-3 p-3 rounded-lg bg-gray-50">
                    <svg
                      className="mt-0.5 shrink-0"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.89453 7.80506C3.89453 4.08157 7.12254 1.14581 10.9987 1.14581C14.8749 1.14581 18.1029 4.08157 18.1029 7.80506C18.1029 11.2986 15.9369 15.4 12.4423 16.8934C11.5248 17.2855 10.4726 17.2855 9.55514 16.8934C6.06051 15.4 3.89453 11.2986 3.89453 7.80506ZM10.9987 2.52081C7.7872 2.52081 5.26953 4.93234 5.26953 7.80506C5.26953 10.856 7.19951 14.3915 10.0955 15.629C10.6678 15.8736 11.3296 15.8736 11.9019 15.629C14.7979 14.3915 16.7279 10.856 16.7279 7.80506C16.7279 4.93234 14.2102 2.52081 10.9987 2.52081ZM10.9987 7.10415C10.3659 7.10415 9.85286 7.61715 9.85286 8.24998C9.85286 8.88281 10.3659 9.39581 10.9987 9.39581C11.6315 9.39581 12.1445 8.88281 12.1445 8.24998C12.1445 7.61715 11.6315 7.10415 10.9987 7.10415ZM8.47786 8.24998C8.47786 6.85776 9.60648 5.72915 10.9987 5.72915C12.3909 5.72915 13.5195 6.85776 13.5195 8.24998C13.5195 9.6422 12.3909 10.7708 10.9987 10.7708C9.60648 10.7708 8.47786 9.6422 8.47786 8.24998ZM3.29449 13.7469C3.54935 14.0283 3.52779 14.4631 3.24634 14.7179C2.72595 15.1891 2.51953 15.6402 2.51953 16.0416C2.51953 16.7417 3.18321 17.6044 4.79901 18.3315C6.35028 19.0296 8.54159 19.4791 10.9987 19.4791C13.4558 19.4791 15.6471 19.0296 17.1984 18.3315C18.8142 17.6044 19.4779 16.7417 19.4779 16.0416C19.4779 15.6402 19.2714 15.1891 18.7511 14.7179C18.4696 14.4631 18.448 14.0283 18.7029 13.7468C18.9578 13.4654 19.3925 13.4438 19.674 13.6987C20.3734 14.332 20.8529 15.126 20.8529 16.0416C20.8529 17.6198 19.4645 18.8196 17.7626 19.5854C15.9962 20.3803 13.6042 20.8541 10.9987 20.8541C8.3932 20.8541 6.00117 20.3803 4.23476 19.5854C2.53288 18.8196 1.14453 17.6198 1.14453 16.0416C1.14453 15.126 1.62399 14.332 2.32341 13.6987C2.60487 13.4438 3.03963 13.4654 3.29449 13.7469Z"
                        fill="#C09C6C"
                      />
                    </svg>
                    <span className="text-body">
                      Address: {siteConfig.contact.address}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-5 pt-5 border-t border-gray-200">
                    <a
                      href={siteConfig.social.facebook}
                      aria-label="Facebook Social Link"
                      className="flex ease-out duration-200 hover:opacity-80 transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#1877F2"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    </a>
                    {/* 
                    <a
                      href="#"
                      aria-label="Twitter Social Link"
                      className="flex ease-out duration-200 hover:text-blue"
                    >
                      <svg
                        className="fill-current"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M18.3332 4.91293C17.7353 5.18229 17.0875 5.36594 16.39 5.46389C17.1124 5.02312 17.6107 4.39869 17.8847 3.59061C17.2121 3.98241 16.4896 4.25177 15.7173 4.39869C15.0447 3.68856 14.1976 3.3335 13.1762 3.3335C12.2544 3.3335 11.4572 3.66407 10.7846 4.32523C10.1119 4.98639 9.77562 5.78223 9.77562 6.71274C9.77562 6.95762 9.81299 7.21473 9.88773 7.48409C8.49261 7.41063 7.17223 7.06781 5.92659 6.45563C4.70587 5.81896 3.67198 4.98639 2.82495 3.95792C2.526 4.47216 2.37652 5.03536 2.37652 5.64755C2.37652 6.23524 2.51354 6.77396 2.78758 7.26371C3.06162 7.75345 3.42286 8.14525 3.87129 8.4391C3.34812 8.4391 2.83741 8.30442 2.33915 8.03506V8.07179C2.33915 8.87987 2.60073 9.59 3.1239 10.2022C3.64707 10.8144 4.29481 11.2062 5.0671 11.3776C4.79306 11.451 4.49411 11.4878 4.17024 11.4878C3.97094 11.4878 3.75918 11.4633 3.53496 11.4143C3.75918 12.0999 4.15778 12.6632 4.73078 13.1039C5.32869 13.5202 5.98888 13.7406 6.71135 13.7651C5.49062 14.7201 4.08305 15.1976 2.48863 15.1976C2.21459 15.1976 1.94054 15.1853 1.6665 15.1609C3.26092 16.1648 5.00482 16.6668 6.89819 16.6668C8.89122 16.6668 10.66 16.1648 12.2046 15.1609C13.6247 14.2793 14.7333 13.0794 15.5305 11.5612C16.2779 10.1165 16.6516 8.635 16.6516 7.11678L16.6142 6.67601C17.2868 6.21075 17.8598 5.62306 18.3332 4.91293Z"
                          fill=""
                        />
                      </svg>
                    </a> */}

                    <a
                      href={siteConfig.social.instagram}
                      aria-label="Instagram Social Link"
                      className="flex ease-out duration-200 hover:opacity-80 transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="url(#instagramGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <defs>
                          <linearGradient
                            id="instagramGradient"
                            x1="0%"
                            y1="100%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop
                              offset="0%"
                              style={{ stopColor: "#E1306C", stopOpacity: 1 }}
                            />
                            <stop
                              offset="100%"
                              style={{ stopColor: "#C13584", stopOpacity: 1 }}
                            />
                          </linearGradient>
                        </defs>
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="5"
                          ry="5"
                        />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </a>

                    {/* <a
                      href="#"
                      aria-label="Linkedin Social Link"
                      className="flex ease-out duration-200 hover:text-blue"
                    >
                      <svg
                        className="fill-current"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M16.6535 1.6665C17.1222 1.6665 17.5129 1.83577 17.8254 2.17432C18.1639 2.48682 18.3332 2.87744 18.3332 3.34619V16.6535C18.3332 17.1222 18.1639 17.5259 17.8254 17.8644C17.5129 18.1769 17.1222 18.3332 16.6535 18.3332H3.34619C2.87744 18.3332 2.4738 18.1769 2.13525 17.8644C1.82275 17.5259 1.6665 17.1222 1.6665 16.6535V3.34619C1.6665 2.87744 1.82275 2.48682 2.13525 2.17432C2.4738 1.83577 2.87744 1.6665 3.34619 1.6665H16.6535ZM15.4295 15.4295V11.0155C15.4295 10.2603 15.1561 9.62223 14.6092 9.1014C14.0884 8.55452 13.4504 8.28109 12.6952 8.28109C12.3306 8.28109 11.966 8.38525 11.6014 8.59359C11.2368 8.80192 10.9634 9.06234 10.7811 9.37484V8.43734H8.43734V15.4295H10.7811V11.2889C10.7811 10.9764 10.8853 10.716 11.0936 10.5077C11.328 10.2733 11.6014 10.1561 11.9139 10.1561C12.2524 10.1561 12.5259 10.2733 12.7342 10.5077C12.9686 10.716 13.0858 10.9764 13.0858 11.2889V15.4295H15.4295ZM5.74202 7.14827C6.13265 7.14827 6.45817 7.01807 6.71859 6.75765C7.00505 6.47119 7.14827 6.13265 7.14827 5.74202C7.14827 5.3514 7.00505 5.02588 6.71859 4.76546C6.45817 4.479 6.13265 4.33577 5.74202 4.33577C5.3514 4.33577 5.01286 4.479 4.7264 4.76546C4.46598 5.02588 4.33577 5.3514 4.33577 5.74202C4.33577 6.13265 4.46598 6.47119 4.7264 6.75765C5.01286 7.01807 5.3514 7.14827 5.74202 7.14827ZM6.87484 15.4295V8.43734H4.57015V15.4295H6.87484Z"
                          fill=""
                        />
                        <path
                          opacity="0.04"
                          d="M15.4297 15.4297V11.0156C15.4297 10.2604 15.1562 9.6224 14.6094 9.10156C14.0885 8.55469 13.4505 8.28125 12.6953 8.28125C12.3307 8.28125 11.9661 8.38542 11.6016 8.59375C11.237 8.80208 10.9635 9.0625 10.7812 9.375V8.4375H8.4375V15.4297H10.7812V11.2891C10.7812 10.9766 10.8854 10.7161 11.0938 10.5078C11.3281 10.2734 11.6016 10.1562 11.9141 10.1562C12.2526 10.1562 12.526 10.2734 12.7344 10.5078C12.9688 10.7161 13.0859 10.9766 13.0859 11.2891V15.4297H15.4297ZM5.74219 7.14844C6.13281 7.14844 6.45833 7.01823 6.71875 6.75781C7.00521 6.47135 7.14844 6.13281 7.14844 5.74219C7.14844 5.35156 7.00521 5.02604 6.71875 4.76562C6.45833 4.47917 6.13281 4.33594 5.74219 4.33594C5.35156 4.33594 5.01302 4.47917 4.72656 4.76562C4.46615 5.02604 4.33594 5.35156 4.33594 5.74219C4.33594 6.13281 4.46615 6.47135 4.72656 6.75781C5.01302 7.01823 5.35156 7.14844 5.74219 7.14844ZM6.875 15.4297V8.4375H4.57031V15.4297H6.875Z"
                          fill=""
                        />
                      </svg>
                    </a> */}
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:flex-[0.68] w-full bg-gradient-to-br from-gray-2 to-gray-50 rounded-2xl shadow-lg border border-gray-200 p-5 sm:p-6 lg:p-8">
              <div className="mb-5">
                <h2 className="font-bold text-2xl sm:text-3xl text-dark mb-2">
                  Send us a Message
                </h2>
                <p className="text-body text-sm">
                  Fill out the form below and we&apos;ll get back to you as soon
                  as possible.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="w-full">
                    <label
                      htmlFor="firstName"
                      className="block mb-2 font-medium text-dark text-sm"
                    >
                      First Name <span className="text-red">*</span>
                    </label>

                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="w-full">
                    <label
                      htmlFor="lastName"
                      className="block mb-2 font-medium text-dark text-sm"
                    >
                      Last Name <span className="text-red">*</span>
                    </label>

                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Deo"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="w-full">
                    <label
                      htmlFor="email"
                      className="block mb-2 font-medium text-dark text-sm"
                    >
                      Email Address <span className="text-red">*</span>
                    </label>

                    <input
                      type="email"
                      name="email"
                      id="email"
                      placeholder="john@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="w-full">
                    <label
                      htmlFor="phone"
                      className="block mb-2 font-medium text-dark text-sm"
                    >
                      Phone
                    </label>

                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      placeholder="Enter your phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block mb-2 font-medium text-dark text-sm"
                  >
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    placeholder="Type your subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full py-2.5 px-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block mb-2 font-medium text-dark text-sm"
                  >
                    Message <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    name="message"
                    id="message"
                    rows={5}
                    placeholder="Type your message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="rounded-lg border-2 border-gray-200 bg-gray-2 placeholder:text-gray-400 w-full p-4 outline-none duration-200 hover:border-gray-300 focus:border-blue focus:shadow-lg focus:ring-2 focus:ring-blue/10 resize-none"
                    disabled={isSubmitting}
                  ></textarea>
                </div>

                {status && (
                  <div
                    className={`p-4 rounded-lg text-sm font-medium ${
                      status.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                    aria-live="polite"
                  >
                    {status.message}
                  </div>
                )}

                <button
                  type="submit"
                  className={`inline-flex items-center justify-center font-bold text-white bg-gradient-to-r from-blue to-blue-dark py-3.5 px-8 rounded-lg ease-out duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </SiteContainer>
      </section>
    </>
  );
};

export default Contact;
