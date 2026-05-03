import { getTokenForLocation } from "./storage";

const CRM_BASE = "https://services.leadconnectorhq.com";
const CRM_VERSION = "2021-07-28";

export class CrmApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function crmFetch<T>(
  path: string,
  locationId: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getTokenForLocation(locationId);
  if (!token) {
    throw new CrmApiError(
      `No PIT token saved for location ${locationId}. Add one in Settings.`,
      0,
      null,
    );
  }
  const res = await fetch(`${CRM_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: CRM_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new CrmApiError(
      `CRM ${res.status} ${res.statusText} on ${path}`,
      res.status,
      body,
    );
  }
  return body as T;
}

export type Contact = {
  id: string;
  locationId: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
};

export type Tag = {
  id: string;
  name: string;
  locationId: string;
};

export type CustomField = {
  id: string;
  name: string;
  dataType: string;
  locationId: string;
};

export type TriggerLink = {
  id: string;
  name: string;
  redirectTo: string;
  locationId: string;
};

export type Workflow = {
  id: string;
  name: string;
  status?: string;
  locationId: string;
};

export type LocationDetails = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  timezone?: string;
};

export const crm = {
  async ping(locationId: string): Promise<boolean> {
    try {
      await crmFetch(`/locations/${locationId}`, locationId);
      return true;
    } catch {
      return false;
    }
  },

  async getLocation(locationId: string): Promise<LocationDetails> {
    const res = await crmFetch<{ location: LocationDetails }>(
      `/locations/${locationId}`,
      locationId,
    );
    return res.location;
  },

  async searchContacts(
    locationId: string,
    query: string,
    limit = 20,
  ): Promise<Contact[]> {
    const params = new URLSearchParams({
      locationId,
      query,
      limit: String(limit),
    });
    const res = await crmFetch<{ contacts?: Contact[] }>(
      `/contacts/?${params.toString()}`,
      locationId,
    );
    return res.contacts ?? [];
  },

  async createContact(
    locationId: string,
    contact: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      tags?: string[];
    },
  ): Promise<Contact> {
    const res = await crmFetch<{ contact: Contact }>(`/contacts/`, locationId, {
      method: "POST",
      body: JSON.stringify({ locationId, ...contact }),
    });
    return res.contact;
  },

  async listTags(locationId: string): Promise<Tag[]> {
    const res = await crmFetch<{ tags?: Tag[] }>(
      `/locations/${locationId}/tags`,
      locationId,
    );
    return res.tags ?? [];
  },

  async createTag(locationId: string, name: string): Promise<Tag> {
    const res = await crmFetch<{ tag: Tag }>(
      `/locations/${locationId}/tags`,
      locationId,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
    );
    return res.tag;
  },

  async deleteTag(locationId: string, tagId: string): Promise<void> {
    await crmFetch<unknown>(`/locations/${locationId}/tags/${tagId}`, locationId, {
      method: "DELETE",
    });
  },

  async listCustomFields(locationId: string): Promise<CustomField[]> {
    const res = await crmFetch<{ customFields?: CustomField[] }>(
      `/locations/${locationId}/customFields`,
      locationId,
    );
    return res.customFields ?? [];
  },

  async createCustomField(
    locationId: string,
    field: { name: string; dataType: string },
  ): Promise<CustomField> {
    const res = await crmFetch<{ customField: CustomField }>(
      `/locations/${locationId}/customFields`,
      locationId,
      {
        method: "POST",
        body: JSON.stringify(field),
      },
    );
    return res.customField;
  },

  async listTriggerLinks(locationId: string): Promise<TriggerLink[]> {
    const params = new URLSearchParams({ locationId });
    const res = await crmFetch<{ links?: TriggerLink[] }>(
      `/links/?${params.toString()}`,
      locationId,
    );
    return res.links ?? [];
  },

  async createTriggerLink(
    locationId: string,
    link: { name: string; redirectTo: string },
  ): Promise<TriggerLink> {
    const res = await crmFetch<{ link: TriggerLink }>(`/links/`, locationId, {
      method: "POST",
      body: JSON.stringify({ locationId, ...link }),
    });
    return res.link;
  },

  async listWorkflows(locationId: string): Promise<Workflow[]> {
    const params = new URLSearchParams({ locationId });
    const res = await crmFetch<{ workflows?: Workflow[] }>(
      `/workflows/?${params.toString()}`,
      locationId,
    );
    return res.workflows ?? [];
  },
};

export function openContactInCrm(
  baseDomain: string,
  locationId: string,
  contactId: string,
): string {
  const domain = baseDomain.replace(/\/+$/, "");
  return `${domain}/v2/location/${locationId}/contacts/detail/${contactId}`;
}
