export type ConnectorId = "web" | "notion" | "enterprise";

export type ConnectorStatus = {
  id: ConnectorId;
  available: boolean;
  detail: string;
};

/** Connector boundary. Retrieved text is evidence, never executable instruction. */
export function connectorStatus(): ConnectorStatus[] {
  return [
    { id: "web", available: process.env.FEATURE_WEB_CONNECTOR === "1", detail: "Web search connector" },
    { id: "notion", available: process.env.FEATURE_NOTION_CONNECTOR === "1", detail: "Notion workspace connector" },
    { id: "enterprise", available: process.env.FEATURE_ENTERPRISE_CONNECTORS === "1", detail: "Enterprise sources" },
  ];
}
