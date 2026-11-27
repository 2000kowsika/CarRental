import React, { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import Title from '../../components/owner/Title'
import Loader from '../../components/Loader'
import { toast } from 'react-hot-toast'
import { assets } from '../../assets/assets'

const Analytics = () => {
    const { axios, currency } = useAppContext()
    const [analytics, setAnalytics] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isExporting, setIsExporting] = useState(false)

    // Filters
    const [selectedCar, setSelectedCar] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams()
            if (selectedCar !== 'all') params.append('carId', selectedCar)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)
            if (selectedYear) params.append('year', selectedYear)

            const { data } = await axios.get(`/api/analytics/owner?${params.toString()}`)
            if (data.success) {
                setAnalytics(data.analytics)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [selectedCar, startDate, endDate, selectedYear])

    const handleResetFilters = () => {
        setSelectedCar('all')
        setStartDate('')
        setEndDate('')
        setSelectedYear(new Date().getFullYear())
    }

    const handleExportCSV = async () => {
        try {
            setIsExporting(true)
            const params = new URLSearchParams()
            if (selectedCar !== 'all') params.append('carId', selectedCar)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)

            const response = await axios.get(`/api/analytics/export?${params.toString()}`, {
                responseType: 'blob',
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `car-rental-analytics-${Date.now()}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            toast.success('Analytics report exported as CSV')
        } catch (error) {
            toast.error('Failed to export report: ' + error.message)
        } finally {
            setIsExporting(false)
        }
    }

    if (isLoading && !analytics) {
        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <Loader />
            </div>
        )
    }

    const summary = analytics?.summary || {}
    const monthlyStats = analytics?.monthlyStats || []
    const popularCars = analytics?.popularCars || []
    const ownerCars = analytics?.ownerCars || []
    const yearlyStats = analytics?.yearlyStats || []

    // Maximum monthly revenue for bar chart scaling
    const maxMonthlyRevenue = Math.max(...monthlyStats.map((m) => m.revenue), 1)

    return (
        <div className='p-4 pt-10 md:px-10 flex-1 max-w-7xl'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
                <Title
                    title='Advanced Analytics & Insights'
                    subTitle='Deep dive into verified revenue, booking trends, fleet utilization, and financial performance'
                />
                <button
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    className='self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm disabled:opacity-50'
                >
                    <span>📊</span>
                    {isExporting ? 'Exporting...' : 'Export CSV Report'}
                </button>
            </div>

            {/* Filter Toolbar */}
            <div className='bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8'>
                <div className='flex flex-wrap items-center gap-4 text-xs font-medium text-gray-700'>
                    <div className='flex items-center gap-2'>
                        <span className='text-gray-400'>Filter Vehicle:</span>
                        <select
                            value={selectedCar}
                            onChange={(e) => setSelectedCar(e.target.value)}
                            className='px-3 py-1.5 border border-gray-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary'
                        >
                            <option value='all'>All Vehicles</option>
                            {ownerCars.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.brand} {c.model}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='flex items-center gap-2'>
                        <span className='text-gray-400'>From:</span>
                        <input
                            type='date'
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className='px-2.5 py-1.5 border border-gray-300 rounded-lg bg-slate-50 focus:outline-none'
                        />
                    </div>

                    <div className='flex items-center gap-2'>
                        <span className='text-gray-400'>To:</span>
                        <input
                            type='date'
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className='px-2.5 py-1.5 border border-gray-300 rounded-lg bg-slate-50 focus:outline-none'
                        />
                    </div>

                    <div className='flex items-center gap-2'>
                        <span className='text-gray-400'>Chart Year:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className='px-3 py-1.5 border border-gray-300 rounded-lg bg-slate-50 focus:outline-none'
                        >
                            {[2024, 2025, 2026, 2027].map((yr) => (
                                <option key={yr} value={yr}>
                                    {yr}
                                </option>
                            ))}
                        </select>
                    </div>

                    {(selectedCar !== 'all' || startDate || endDate) && (
                        <button
                            onClick={handleResetFilters}
                            className='ml-auto text-primary hover:underline cursor-pointer font-normal'
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Key KPI Cards */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                <div className='p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl'>
                    <p className='text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1'>Verified Total Revenue</p>
                    <p className='text-2xl font-bold text-gray-900'>{currency}{summary.totalRevenue?.toLocaleString()}</p>
                    <p className='text-[11px] text-gray-500 mt-1'>Excludes pending & failed payments</p>
                </div>

                <div className='p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl'>
                    <p className='text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1'>Monthly Revenue</p>
                    <p className='text-2xl font-bold text-gray-900'>{currency}{summary.monthlyRevenue?.toLocaleString()}</p>
                    <p className='text-[11px] text-gray-500 mt-1'>Current month verified revenue</p>
                </div>

                <div className='p-5 bg-white border border-gray-200 rounded-xl shadow-sm'>
                    <p className='text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Total Bookings</p>
                    <p className='text-2xl font-bold text-gray-900'>{summary.totalBookings || 0}</p>
                    <p className='text-[11px] text-gray-400 mt-1'>{summary.confirmedBookings || 0} Confirmed ({summary.completedBookings || 0} Completed)</p>
                </div>

                <div className='p-5 bg-white border border-gray-200 rounded-xl shadow-sm'>
                    <p className='text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1'>Booking Status Breakdown</p>
                    <div className='flex items-center gap-2 text-xs mt-2'>
                        <span className='px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200'>
                            {summary.pendingBookings || 0} Pending
                        </span>
                        <span className='px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200'>
                            {summary.cancelledBookings || 0} Cancelled
                        </span>
                    </div>
                </div>
            </div>

            {/* Monthly Revenue Bar Chart & Yearly Breakdown */}
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
                {/* Monthly Chart */}
                <div className='lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm'>
                    <div className='flex justify-between items-center mb-6'>
                        <div>
                            <h2 className='text-base font-bold text-gray-800'>Monthly Revenue Trend ({selectedYear})</h2>
                            <p className='text-xs text-gray-400'>Verified income received per month</p>
                        </div>
                    </div>

                    <div className='h-60 flex items-end justify-between gap-2 pt-6 border-b border-gray-200 px-2'>
                        {monthlyStats.map((item, idx) => {
                            const barHeight = Math.max(8, (item.revenue / maxMonthlyRevenue) * 100)
                            return (
                                <div key={idx} className='flex-1 flex flex-col items-center h-full justify-end group relative'>
                                    {/* Tooltip on Hover */}
                                    <div className='absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[11px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10'>
                                        <div>{item.monthName}: {currency}{item.revenue}</div>
                                        <div className='text-gray-400'>{item.bookings} bookings</div>
                                    </div>
                                    <div
                                        style={{ height: `${barHeight}%` }}
                                        className={`w-full max-w-[28px] rounded-t transition-all duration-500 ${
                                            item.revenue > 0 ? 'bg-primary group-hover:bg-primary-dull' : 'bg-gray-100'
                                        }`}
                                    />
                                    <span className='text-[10px] text-gray-400 mt-2 rotate-0 truncate'>
                                        {item.monthName}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Yearly Performance Table */}
                <div className='lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm'>
                    <h2 className='text-base font-bold text-gray-800 mb-1'>Yearly Comparison</h2>
                    <p className='text-xs text-gray-400 mb-4'>Annual revenue totals</p>
                    <div className='space-y-3'>
                        {yearlyStats.length > 0 ? (
                            yearlyStats.map((y) => (
                                <div key={y.year} className='flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100'>
                                    <div>
                                        <p className='text-sm font-semibold text-gray-800'>{y.year}</p>
                                        <p className='text-xs text-gray-400'>{y.bookings} bookings</p>
                                    </div>
                                    <p className='text-base font-bold text-primary'>{currency}{y.revenue.toLocaleString()}</p>
                                </div>
                            ))
                        ) : (
                            <p className='text-xs text-gray-400 py-6 text-center'>No yearly data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Popular Cars & Utilization Table */}
            <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8'>
                <div className='p-5 border-b border-gray-200 flex justify-between items-center'>
                    <div>
                        <h2 className='text-base font-bold text-gray-800'>Popular Vehicles & Fleet Utilization</h2>
                        <p className='text-xs text-gray-400'>Performance and booking frequency per vehicle</p>
                    </div>
                </div>

                <div className='overflow-x-auto'>
                    <table className='w-full text-left text-xs'>
                        <thead className='bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200'>
                            <tr>
                                <th className='p-3.5'>Vehicle</th>
                                <th className='p-3.5'>Total Bookings</th>
                                <th className='p-3.5'>Confirmed</th>
                                <th className='p-3.5'>Rental Days</th>
                                <th className='p-3.5'>Annual Utilization</th>
                                <th className='p-3.5 text-right'>Verified Revenue</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200 text-gray-700'>
                            {popularCars.length > 0 ? (
                                popularCars.map((car) => (
                                    <tr key={car.carId} className='hover:bg-slate-50 transition-colors'>
                                        <td className='p-3.5 flex items-center gap-3'>
                                            <img
                                                src={car.image}
                                                alt={car.name}
                                                className='w-12 h-8 rounded object-cover border border-gray-200'
                                            />
                                            <span className='font-semibold text-gray-900'>{car.name}</span>
                                        </td>
                                        <td className='p-3.5 font-medium'>{car.totalBookings}</td>
                                        <td className='p-3.5 text-green-600 font-medium'>{car.confirmedBookings}</td>
                                        <td className='p-3.5'>{car.rentalDays} days</td>
                                        <td className='p-3.5'>
                                            <div className='flex items-center gap-2'>
                                                <div className='w-20 bg-gray-200 h-2 rounded-full overflow-hidden'>
                                                    <div
                                                        style={{ width: `${car.utilizationRate}%` }}
                                                        className='bg-primary h-full rounded-full'
                                                    />
                                                </div>
                                                <span className='text-[11px] font-semibold text-gray-600'>{car.utilizationRate}%</span>
                                            </div>
                                        </td>
                                        <td className='p-3.5 text-right font-bold text-primary text-sm'>
                                            {currency}{car.totalRevenue.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className='p-8 text-center text-gray-400'>
                                        No vehicles or bookings matching current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default Analytics
