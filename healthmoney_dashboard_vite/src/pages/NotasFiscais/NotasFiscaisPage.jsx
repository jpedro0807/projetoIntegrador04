import React, { useState, useEffect } from "react";
import { Search, Plus, FileText, Download, X, Loader2 } from "lucide-react";

export default function NotasFiscaisPage() {
	const [notas, setNotas] = useState([]);
	const [listaPacientes, setListaPacientes] = useState([]); // <--- ESTADO NOVO: Lista para o Select
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const [formData, setFormData] = useState({
		pacienteId: "",
		nomeCliente: "",
		cpfCnpj: "",
		enderecoCompleto: "",
		bairro: "",
		municipioUf: "",
		descricaoServico: "",
		valor: "",
	});

	// 1. BUSCAR DADOS (NOTAS + PACIENTES)
	const fetchData = async () => {
		try {
			// Busca Histórico de Notas
			const resNotas = await fetch("/api/nfe");
			if (resNotas.ok) setNotas(await resNotas.json());

			const response = await fetch("/api/pacientes");
			if (response.status === 401) {
				window.location.href = "/login";
				return;
			}

			if (response.ok) {
				const data = await response.json();
				console.log(data);
				setListaPacientes(data);
			}
		} catch (error) {
			console.error("Erro ao buscar dados:", error);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	// 2. LÓGICA DO SELECT (AUTO-PREENCHER)
	const handlePacienteChange = (e) => {
		const pid = e.target.value;

		const pacienteSelecionado = listaPacientes.find(
			(p) => String(p.id) === pid
		);

		if (pacienteSelecionado) {
			setFormData((prev) => ({
				...prev,
				pacienteId: pid, // <--- ATUALIZA O SELECT
				nomeCliente: pacienteSelecionado.nome,
				cpfCnpj: pacienteSelecionado.cpf,
				enderecoCompleto: pacienteSelecionado.endereco || "",
				bairro: "",
				municipioUf: "",
			}));
		} else {
			setFormData((prev) => ({
				...prev,
				pacienteId: "", // Limpa o select se der erro
				nomeCliente: "",
				cpfCnpj: "",
				enderecoCompleto: "",
			}));
		}
	};

	// 3. EMISSÃO (POST)
	const handleEmitir = async (e) => {
		e.preventDefault();
		setLoading(true);

		const payload = {
			...formData,
			valorTotal: formData.valor,
			itens: [
				{
					codigo: "001",
					descricao: formData.descricaoServico,
					qtd: "1",
					valorUnitario: formData.valor,
					valorTotal: formData.valor,
				},
			],
		};

		try {
			const response = await fetch("/api/nfe/emitir", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `nota_fiscal_${formData.nomeCliente}.pdf`;
				document.body.appendChild(a);
				a.click();
				a.remove();

				alert("Nota emitida com sucesso!");
				setIsModalOpen(false);
				fetchData(); // Atualiza tabela
				// Limpa form
				setFormData({
					pacienteId: "",
					nomeCliente: "",
					cpfCnpj: "",
					enderecoCompleto: "",
					bairro: "",
					municipioUf: "",
					descricaoServico: "",
					valor: "",
				});
			} else {
				const erroJson = await response.json().catch(() => ({}));
				alert(
					"Erro ao emitir nota: " +
						(erroJson.message || "Verifique o CPF.")
				);
			}
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = async (id) => {
		try {
			const response = await fetch(`/api/nfe/${id}/pdf`);
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `nota_fiscal_${id}.pdf`;
				document.body.appendChild(a);
				a.click();
				a.remove();
			} else {
				alert("Erro ao baixar o PDF.");
			}
		} catch (error) {
			console.error(error);
		}
	};

	const notasFiltradas = notas.filter(
		(n) =>
			n.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
			String(n.id).includes(searchTerm)
	);

	return (
		<main className='flex-1 ml-64 p-8 relative'>
			<header className='flex justify-between items-center mb-8'>
				<div>
					<h2 className='text-3xl font-bold text-gray-900'>
						Notas Fiscais
					</h2>
					<p className='text-gray-500 mt-1'>Histórico de NFS-e emitidas</p>
				</div>
				<button
					onClick={() => setIsModalOpen(true)}
					className='flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors'>
					<Plus size={16} /> Emitir Nova Nota
				</button>
			</header>

			<div className='bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 relative'>
				<Search className='absolute left-7 top-7 text-gray-400' size={20} />
				<input
					type='text'
					placeholder='Buscar por cliente ou número...'
					className='w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
			</div>

			{notas.length === 0 ? (
				<div className='bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center'>
					<FileText size={48} className='text-gray-300' />
					<p className='text-gray-500 mt-4 text-sm font-medium'>
						Nenhuma nota emitida ainda
					</p>
				</div>
			) : (
				<div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
					<table className='w-full text-left'>
						<thead className='bg-gray-50 border-b border-gray-100'>
							<tr>
								<th className='p-4 font-semibold text-gray-600'>Nº</th>
								<th className='p-4 font-semibold text-gray-600'>
									Cliente
								</th>
								<th className='p-4 font-semibold text-gray-600'>
									Data Emissão
								</th>
								<th className='p-4 font-semibold text-gray-600'>
									Valor Total
								</th>
								<th className='p-4 font-semibold text-gray-600 text-right'>
									Arquivo
								</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-gray-100'>
							{notasFiltradas.map((nota) => (
								<tr
									key={nota.id}
									className='hover:bg-gray-50 transition-colors'>
									<td className='p-4 font-bold text-gray-700'>
										#{String(nota.id).padStart(4, "0")}
									</td>
									<td className='p-4 text-gray-900'>
										{nota.nomeCliente}
										<br />
										<span className='text-xs text-gray-400'>
											{nota.cpfCnpj}
										</span>
									</td>
									<td className='p-4 text-gray-600'>
										{new Date(nota.dataEmissao).toLocaleDateString()}
									</td>
									<td className='p-4 font-medium text-emerald-600'>
										R$ {nota.valorTotal?.toFixed(2)}
									</td>
									<td className='p-4 text-right'>
										<button
											onClick={() => handleDownload(nota.id)}
											className='inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors'>
											<Download size={16} /> Baixar PDF
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* MODAL DE EMISSÃO */}
			{isModalOpen && (
				<div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
					<div className='bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 h-[90vh] overflow-y-auto'>
						<div className='flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10'>
							<h3 className='text-xl font-bold text-gray-800'>
								Emitir Nova Nota Fiscal
							</h3>
							<button onClick={() => setIsModalOpen(false)}>
								<X
									size={24}
									className='text-gray-400 hover:text-gray-600'
								/>
							</button>
						</div>

						<form onSubmit={handleEmitir} className='p-6 space-y-4'>
							<div className='bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4'>
								<label className='block text-sm font-bold text-blue-800 mb-1'>
									Selecione o Paciente
								</label>
								<select
									className='w-full border border-blue-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white'
									onChange={handlePacienteChange}
									value={formData.pacienteId} // <--- AGORA É CONTROLADO PELO STATE
								>
									<option value='' disabled>
										-- Escolha um paciente da lista --
									</option>
									{listaPacientes.map((p) => (
										<option key={p.id} value={p.id}>
											{p.nome} (CPF: {p.cpf})
										</option>
									))}
								</select>
								<p className='text-xs text-blue-600 mt-1'>
									Os dados serão preenchidos automaticamente.
								</p>
							</div>
							{/* ---------------------------------- */}

							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Nome do Cliente
									</label>
									<input
										required
										type='text'
										className='w-full border p-2 rounded-lg bg-gray-50'
										readOnly
										value={formData.nomeCliente}
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										CPF / CNPJ
									</label>
									<input
										required
										type='text'
										className='w-full border p-2 rounded-lg bg-gray-50'
										readOnly
										value={formData.cpfCnpj}
									/>
								</div>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Endereço Completo
								</label>
								<input
									required
									type='text'
									className='w-full border p-2 rounded-lg'
									value={formData.enderecoCompleto}
									onChange={(e) =>
										setFormData({
											...formData,
											enderecoCompleto: e.target.value,
										})
									}
								/>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Bairro
									</label>
									<input
										required
										type='text'
										className='w-full border p-2 rounded-lg'
										value={formData.bairro}
										onChange={(e) =>
											setFormData({
												...formData,
												bairro: e.target.value,
											})
										}
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Município - UF
									</label>
									<input
										required
										type='text'
										className='w-full border p-2 rounded-lg'
										value={formData.municipioUf}
										onChange={(e) =>
											setFormData({
												...formData,
												municipioUf: e.target.value,
											})
										}
									/>
								</div>
							</div>

							<div className='border-t pt-4 mt-4'>
								<h4 className='font-semibold text-gray-900 mb-3'>
									Serviço Prestado
								</h4>

								<div className='space-y-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Descrição do Serviço
										</label>
										<input
											required
											type='text'
											placeholder='Ex: Consulta Médica'
											className='w-full border p-2 rounded-lg'
											value={formData.descricaoServico}
											onChange={(e) =>
												setFormData({
													...formData,
													descricaoServico: e.target.value,
												})
											}
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Valor Total (R$)
										</label>
										<input
											required
											type='text'
											placeholder='150,00'
											className='w-full border p-2 rounded-lg'
											value={formData.valor}
											onChange={(e) =>
												setFormData({
													...formData,
													valor: e.target.value,
												})
											}
										/>
									</div>
								</div>
							</div>

							<div className='pt-4 border-t mt-4 flex justify-end gap-3'>
								<button
									type='button'
									onClick={() => setIsModalOpen(false)}
									className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg'>
									Cancelar
								</button>
								<button
									type='submit'
									disabled={loading}
									className='bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-600 flex items-center gap-2'>
									{loading ? (
										<Loader2 className='animate-spin' />
									) : (
										"Emitir e Baixar PDF"
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</main>
	);
}
