"use client";

import { Contact } from "lucide-react";

export default function ContactsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Contact className="h-6 w-6" />
          Contacts
        </h1>
        <p className="text-gray-500 mt-1">Manage your contacts</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500">
        Contacts list will be displayed here.
      </div>
    </div>
  );
}
