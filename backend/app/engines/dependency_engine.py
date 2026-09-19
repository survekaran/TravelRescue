import json

import networkx as nx

from app.models.booking import Booking


class DependencyEngine:
    """
    Builds and analyzes the dependency graph for a travel itinerary.

    Each booking is represented as a node.
    If booking B depends on booking A:

        A -> B
    """

    def __init__(self, bookings: list[Booking]):
        self.bookings = bookings
        self.graph = nx.DiGraph()

    def build_graph(self) -> nx.DiGraph:
        """
        Build a directed dependency graph from the bookings.
        """

        self.graph.clear()

        # Map external references to booking objects.
        booking_map = {
            booking.external_reference: booking
            for booking in self.bookings
            if booking.external_reference
        }

        # Add every booking as a graph node.
        for booking in self.bookings:
            if not booking.external_reference:
                continue

            self.graph.add_node(
                booking.external_reference,
                booking_id=booking.id,
                type=booking.type,
                name=booking.name,
                status=booking.status,
                start_time=booking.start_time,
                end_time=booking.end_time,
            )

        # Add dependency edges.
        for booking in self.bookings:
            if not booking.external_reference:
                continue

            dependencies = self._parse_dependencies(
                booking.depends_on
            )

            for dependency in dependencies:
                if dependency not in booking_map:
                    continue

                self.graph.add_edge(
                    dependency,
                    booking.external_reference
                )

        return self.graph

    @staticmethod
    def _parse_dependencies(depends_on) -> list[str]:
        """
        Convert the database TEXT representation of dependencies
        into a Python list.
        """

        if not depends_on:
            return []

        if isinstance(depends_on, list):
            return depends_on

        try:
            parsed = json.loads(depends_on)

            if isinstance(parsed, list):
                return parsed

        except (json.JSONDecodeError, TypeError):
            pass

        return []

    def validate_dependencies(self) -> dict:
        """
        Validate that every declared dependency refers to an
        existing booking.
        """

        booking_refs = {
            booking.external_reference
            for booking in self.bookings
            if booking.external_reference
        }

        missing_dependencies = []

        for booking in self.bookings:
            if not booking.external_reference:
                continue

            dependencies = self._parse_dependencies(
                booking.depends_on
            )

            for dependency in dependencies:
                if dependency not in booking_refs:
                    missing_dependencies.append(
                        {
                            "booking": booking.external_reference,
                            "missing_dependency": dependency
                        }
                    )

        return {
            "valid": len(missing_dependencies) == 0,
            "missing_dependencies": missing_dependencies
        }

    def get_downstream_bookings(
        self,
        booking_reference: str
    ) -> list[str]:
        """
        Return all bookings that are downstream of the
        specified booking.
        """

        if booking_reference not in self.graph:
            return []

        return list(
            nx.descendants(
                self.graph,
                booking_reference
            )
        )

    def get_dependency_chain(
        self,
        booking_reference: str
    ) -> list[list[str]]:
        """
        Return all dependency paths starting from the
        specified booking.
        """

        if booking_reference not in self.graph:
            return []

        chains = []

        for target in self.graph.nodes:
            if target == booking_reference:
                continue

            if nx.has_path(
                self.graph,
                booking_reference,
                target
            ):
                for path in nx.all_simple_paths(
                    self.graph,
                    booking_reference,
                    target
                ):
                    chains.append(path)

        return chains

    def detect_cycles(self) -> dict:
        """
        Detect circular dependencies in the itinerary.
        """

        cycles = list(
            nx.simple_cycles(self.graph)
        )

        return {
            "has_cycles": len(cycles) > 0,
            "cycles": cycles
        }

    def get_graph_summary(self) -> dict:
        """
        Return a simple summary of the dependency graph.
        """

        return {
            "nodes": list(self.graph.nodes),
            "edges": [
                {
                    "from": source,
                    "to": target
                }
                for source, target in self.graph.edges
            ],
            "node_count": self.graph.number_of_nodes(),
            "edge_count": self.graph.number_of_edges()
        }